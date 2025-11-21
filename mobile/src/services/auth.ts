import { supabase } from "./supabase";
import { authActions } from "../store/auth";

class MobileAuthService {
  private readonly STORAGE_KEY = "guardian_mobile_user";

  async initialize() {
    authActions.setLoading(true);

    console.log("Initializing mobile auth...");

    try {
      const storedUser = this.getStoredUser();

      if (storedUser) {
        const isValid = await this.validateAndRefreshUser(storedUser);

        if (isValid) {
          console.log("Stored user is valid");
          return;
        } else {
          console.log("Stored user is invalid, clearing...");
          this.clearStoredUser();
        }
      }

      console.log("No valid stored user found");
    } catch (error) {
      console.error("Auth initialization error:", error);
      this.clearStoredUser();
    } finally {
      authActions.setLoading(false);
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
      this.storeSession(data.session.token, data.session.expires_at);

      // Create mobile user object with proper typing
      const mobileUser = {
        id: data.user.id as string,
        username: data.user.username as string,
        driver_name: data.user.driver_name as string | undefined,
        safe_id: data.user.safe_id as string,
        safe: data.safe
          ? {
              id: data.safe.id as string,
              serial_number: data.safe.serial_number as string,
              status: data.safe.status as string,
              battery_level: data.safe.battery_level as number,
              is_locked: data.safe.is_locked as boolean,
              tracking_device_id: (data.safe.tracking_device_id ||
                data.safe.tracknetics_device_id) as string | undefined,
            }
          : null,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      this.storeUser(mobileUser);
      authActions.setUser(mobileUser);

      return { success: true };
    } catch (error: any) {
      console.error("Login exception:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }

  async logout() {
    console.log("Logging out...");
    this.clearStoredUser();
    this.clearSession();
    authActions.logout();
  }

  private async validateAndRefreshUser(storedUser: any): Promise<boolean> {
    try {
      // Check if session is still valid
      const session = this.getStoredSession();
      if (!session || new Date(session.expires_at) < new Date()) {
        console.log("Session expired");
        return false;
      }

      // Verify user still exists and is active
      const { data: user, error: userError } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("username", storedUser.username)
        .eq("is_active", true)
        .single();

      if (userError || !user) {
        console.log("User validation failed:", userError);
        return false;
      }

      // Get fresh safe data
      const { data: safe, error: safeError } = await supabase
        .from("safes")
        .select("*")
        .eq("id", user.safe_id)
        .single();

      if (safeError) {
        console.log("Safe lookup failed:", safeError);
        // Continue with null safe
      }

      const refreshedUser = {
        id: user.id as string,
        username: user.username as string,
        driver_name: user.driver_name as string | undefined,
        safe_id: user.safe_id as string,
        safe: safe
          ? {
              id: safe.id as string,
              serial_number: safe.serial_number as string,
              status: safe.status as string,
              battery_level: safe.battery_level as number,
              is_locked: safe.is_locked as boolean,
              tracking_device_id: (safe.tracking_device_id ||
                safe.tracknetics_device_id) as string | undefined,
            }
          : null,
        is_active: user.is_active as boolean,
        created_at: user.created_at as string,
      };

      this.storeUser(refreshedUser);
      authActions.setUser(refreshedUser);

      return true;
    } catch (error) {
      console.error("User validation error:", error);
      return false;
    }
  }

  private getStoredUser(): any {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private storeUser(user: any): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Failed to store user:", error);
    }
  }

  private clearStoredUser(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear stored user:", error);
    }
  }

  private getStoredSession(): { token: string; expires_at: string } | null {
    try {
      const stored = localStorage.getItem("guardian_mobile_session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private storeSession(token: string, expires_at: string): void {
    try {
      localStorage.setItem(
        "guardian_mobile_session",
        JSON.stringify({ token, expires_at })
      );
    } catch (error) {
      console.error("Failed to store session:", error);
    }
  }

  private clearSession(): void {
    try {
      localStorage.removeItem("guardian_mobile_session");
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  }

  // Get current session token for authenticated requests
  getSessionToken(): string | null {
    const session = this.getStoredSession();
    if (!session || new Date(session.expires_at) < new Date()) {
      return null;
    }
    return session.token;
  }
}

export const mobileAuthService = new MobileAuthService();
