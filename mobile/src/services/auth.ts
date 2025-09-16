import { supabase } from "./supabase";
import { authActions } from "../store/auth";

class MobileAuthService {
  async initialize() {
    authActions.setLoading(true);

    try {
      // Check if we have stored credentials
      const storedUser = localStorage.getItem("guardian_mobile_user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        // Verify user is still active
        const isValid = await this.validateStoredUser(userData.username);
        if (isValid) {
          authActions.setUser(userData);
          return;
        } else {
          localStorage.removeItem("guardian_mobile_user");
        }
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
      localStorage.removeItem("guardian_mobile_user");
    } finally {
      authActions.setLoading(false);
    }
  }

  async login(username: string, password: string) {
    try {
      // Hash the password to match stored hash
      const passwordHash = await this.hashPassword(password);

      // Query mobile_users table
      const { data, error } = await supabase
        .from("mobile_users")
        .select(
          `
          id,
          safe_id,
          username,
          driver_name,
          is_active,
          created_at,
          safes!inner(
            id,
            serial_number,
            status,
            battery_level,
            is_locked,
            tracking_device_id
          )
        `
        )
        .eq("username", username)
        .eq("password_hash", passwordHash)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return { success: false, error: "Invalid username or password" };
      }

      // Transform to our user format
      const mobileUser = {
        id: data.id,
        username: data.username,
        driver_name: data.driver_name,
        safe_id: data.safe_id,
        safe: data.safes,
        is_active: data.is_active,
        created_at: data.created_at,
      };

      // Store user data locally
      localStorage.setItem("guardian_mobile_user", JSON.stringify(mobileUser));

      // Update auth state
      authActions.setUser(mobileUser);

      return { success: true };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, error: "Login failed. Please try again." };
    }
  }

  async logout() {
    localStorage.removeItem("guardian_mobile_user");
    authActions.logout();
  }

  // Validate stored user is still active
  private async validateStoredUser(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("mobile_users")
        .select("is_active")
        .eq("username", username)
        .single();

      return !error && data?.is_active === true;
    } catch {
      return false;
    }
  }

  // Hash password to match server-side hash
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
