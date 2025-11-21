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
    console.log("Attempting login for:", username);

    try {
      const passwordHash = await this.hashPassword(password);

      const { data: users, error: findError } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("username", username)
        .eq("is_active", true);

      console.log("User lookup error:", findError);

      if (findError) {
        console.error("Database error:", findError);
        return { success: false, error: "Database connection error" };
      }

      if (!users || users.length === 0) {
        console.log("No user found with username:", username);
        return { success: false, error: "Invalid username or password" };
      }

      const user = users[0];
      console.log("Found user:", user.username);

      if (user.password_hash !== passwordHash) {
        return { success: false, error: "Invalid username or password" };
      }

      console.log("Password verified");

      const { data: safe, error: safeError } = await supabase
        .from("safes")
        .select("*")
        .eq("id", user.safe_id)
        .single();

      console.log("Safe lookup error:", safeError);

      if (safeError || !safe) {
        console.error("Safe not found:", safeError);
        return { success: false, error: "Safe not accessible" };
      }

      const mobileUser = {
        id: user.id,
        username: user.username,
        driver_name: user.driver_name,
        safe_id: user.safe_id,
        safe: {
          id: safe.id,
          serial_number: safe.serial_number,
          status: safe.status,
          battery_level: safe.battery_level,
          is_locked: safe.is_locked,
          tracking_device_id: safe.tracking_device_id,
        },
        is_active: user.is_active,
        created_at: user.created_at,
      };

      console.log("Login successful for:", mobileUser.username);

      this.storeUser(mobileUser);
      authActions.setUser(mobileUser);

      return { success: true };
    } catch (error) {
      console.error("Login exception:", error);
      return { success: false, error: "Login failed. Please try again." };
    }
  }

  async logout() {
    console.log("Logging out...");
    this.clearStoredUser();
    authActions.logout();
  }

  private async validateAndRefreshUser(storedUser: any): Promise<boolean> {
    try {
      const { data: user, error: userError } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("username", storedUser.username)
        .eq("is_active", true)
        .single();

      if (userError || !user) {
        return false;
      }

      const { data: safe, error: safeError } = await supabase
        .from("safes")
        .select("*")
        .eq("id", user.safe_id)
        .single();

      if (safeError || !safe) {
        return false;
      }

      const refreshedUser = {
        ...user,
        safe: {
          id: safe.id,
          serial_number: safe.serial_number,
          status: safe.status,
          battery_level: safe.battery_level,
          is_locked: safe.is_locked,
          tracking_device_id: safe.tracking_device_id,
        },
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

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

export const mobileAuthService = new MobileAuthService();
