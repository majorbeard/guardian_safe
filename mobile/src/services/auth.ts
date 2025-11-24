import { supabase } from "./supabase";
import { authActions } from "../store/auth";
import { storageService } from "./storage";

interface StoredSession {
  token: string;
  expires_at: string;
}

class MobileAuthService {
  private readonly STORAGE_KEY = "guardian_mobile_user";
  private readonly SESSION_KEY = "guardian_mobile_session";
  private sessionCheckInterval: number | null = null;

  async initialize() {
    console.log("Initializing mobile auth service...");
    authActions.setLoading(true);

    try {
      const storedUser = await this.getStoredUser();
      const session = await this.getStoredSession();

      if (storedUser && session) {
        const sessionExpiry = new Date(session.expires_at);
        const now = new Date();

        // 1. Check if token is valid by date
        if (sessionExpiry > now) {
          console.log(
            "Valid session found in storage. Logging in optimistically."
          );

          // OPTIMISTIC LOGIN: Set user immediately from storage
          // This allows the app to open even if offline
          authActions.setUser(storedUser);
          this.startSessionMonitoring();

          // 2. Refresh data in the background (fire and forget)
          // We do not await this, so it doesn't block the UI
          this.validateAndRefreshUser(storedUser).catch((err) => {
            console.warn("Background refresh failed (likely offline):", err);
            // Do NOT logout here. If the token is truly invalid,
            // API calls in trips.ts will return 401 and trigger logout later.
          });

          authActions.setLoading(false);
          return;
        } else {
          console.log("Session expired by date.");
        }
      }

      console.log("No valid session found, clearing storage");
      await this.clearStoredUser();
      await this.clearSession();
      authActions.logout(); // Ensure state is cleared
    } catch (error) {
      console.error("Error during auth initialization:", error);
      // In case of catastrophic error, safer to logout
      await this.clearStoredUser();
      await this.clearSession();
      authActions.logout();
    } finally {
      authActions.setLoading(false);
    }
  }

  private startSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    // Check session validity every 5 minutes
    this.sessionCheckInterval = window.setInterval(async () => {
      const session = await this.getStoredSession();
      if (!session || new Date(session.expires_at) < new Date()) {
        console.log("Session expired during monitoring, logging out");
        await this.logout();
      }
    }, 5 * 60 * 1000);
  }

  private stopSessionMonitoring() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  async login(username: string, password: string) {
    console.log("Attempting mobile login for:", username);

    try {
      // Call the mobile-auth Edge Function
      const { data, error } = await supabase.functions.invoke("mobile-auth", {
        body: {
          username: username.trim(),
          password: password,
        },
      });

      if (error) {
        console.error("Mobile auth error:", error);
        return { success: false, error: "Login failed. Please try again." };
      }

      if (!data.success) {
        console.log("Login failed:", data.error);
        return { success: false, error: data.error || "Invalid credentials" };
      }

      console.log("Login successful for:", data.user.username);

      // Store session token
      await this.storeSession(data.session.token, data.session.expires_at);

      // Create mobile user object
      const mobileUser = {
        id: data.user.id,
        username: data.user.username,
        driver_name: data.user.driver_name,
        safe_id: data.user.safe_id,
        safe: data.safe
          ? {
              id: data.safe.id,
              serial_number: data.safe.serial_number,
              status: data.safe.status,
              battery_level: data.safe.battery_level,
              is_locked: data.safe.is_locked,
              tracking_device_id:
                data.safe.tracking_device_id || data.safe.tracknetics_device_id,
            }
          : null,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      await this.storeUser(mobileUser);
      authActions.setUser(mobileUser);

      // Start session monitoring
      this.startSessionMonitoring();

      return { success: true };
    } catch (error: any) {
      console.error("Login exception:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }

  async logout() {
    console.log("Logging out...");
    this.stopSessionMonitoring();
    await this.clearStoredUser();
    await this.clearSession();
    authActions.logout();
  }

  // Refactored to just return boolean success, not logout
  private async validateAndRefreshUser(storedUser: any): Promise<boolean> {
    try {
      console.log("Background refreshing user data...");

      // Note: This query might fail if your RLS (Row Level Security)
      // blocks 'anon' requests and the standard Supabase client
      // doesn't have the custom session token.
      const { data: user, error: userError } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("username", storedUser.username)
        .eq("is_active", true)
        .single();

      if (userError || !user) {
        console.warn(
          "Could not refresh user (RLS or Network error):",
          userError
        );
        return false;
      }

      const { data: safe, error: safeError } = await supabase
        .from("safes")
        .select("*")
        .eq("id", user.safe_id)
        .single();

      if (safeError) {
        console.warn("Could not refresh safe:", safeError);
        // Don't fail completely if just the safe data is missing
      }

      const refreshedUser = {
        id: user.id,
        username: user.username,
        driver_name: user.driver_name,
        safe_id: user.safe_id,
        safe: safe
          ? {
              id: safe.id,
              serial_number: safe.serial_number,
              status: safe.status,
              battery_level: safe.battery_level,
              is_locked: safe.is_locked,
              tracking_device_id:
                safe.tracking_device_id || safe.tracknetics_device_id,
            }
          : null,
        is_active: true,
        created_at: user.created_at,
      };

      // Only update if we successfully got new data
      await this.storeUser(refreshedUser);
      authActions.setUser(refreshedUser);
      console.log("User data refreshed successfully");
      return true;
    } catch (error) {
      console.error("Error validating user:", error);
      return false;
    }
  }

  private async getStoredUser(): Promise<any> {
    return await storageService.get(this.STORAGE_KEY);
  }

  private async storeUser(user: any): Promise<void> {
    await storageService.set(this.STORAGE_KEY, user);
  }

  private async clearStoredUser(): Promise<void> {
    await storageService.remove(this.STORAGE_KEY);
  }

  private async getStoredSession(): Promise<StoredSession | null> {
    return await storageService.get<StoredSession>(this.SESSION_KEY);
  }

  private async storeSession(token: string, expires_at: string): Promise<void> {
    await storageService.set(this.SESSION_KEY, { token, expires_at });
  }

  private async clearSession(): Promise<void> {
    await storageService.remove(this.SESSION_KEY);
  }

  async getSessionToken(): Promise<string | null> {
    const session = await this.getStoredSession();
    if (!session) return null;

    const expiresAt = new Date(session.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      return null;
    }

    return session.token;
  }
}

export const mobileAuthService = new MobileAuthService();
