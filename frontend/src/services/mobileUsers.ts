import { supabase } from "../lib/supabase";

export interface CreateMobileUserData {
  safe_id: string;
  driver_name?: string;
}

export interface MobileUserCredentials {
  username: string;
  password: string;
}

class MobileUserService {
  // Generate username from safe serial number
  generateUsername(serialNumber: string): string {
    // Convert "GS-2024-001" to "gs2024001_driver"
    return serialNumber.toLowerCase().replace(/[^a-z0-9]/g, "") + "_driver";
  }

  // Generate secure password
  generatePassword(): string {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Hash password for storage
  private async hashPassword(password: string): Promise<string> {
    // Simple hash for demo - in production use proper bcrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Create mobile app user
  async createMobileUser(
    safeId: string,
    serialNumber: string,
    driverName?: string
  ): Promise<{
    success: boolean;
    credentials?: MobileUserCredentials;
    error?: string;
  }> {
    try {
      // Generate credentials
      const username = this.generateUsername(serialNumber);
      const password = this.generatePassword();
      const passwordHash = await this.hashPassword(password);

      // Get current user for created_by
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

      // Create mobile user record
      const { error } = await supabase
        .from("mobile_users")
        .insert({
          safe_id: safeId,
          username,
          password_hash: passwordHash,
          driver_name: driverName,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to create mobile user:", error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        credentials: { username, password },
      };
    } catch (err) {
      console.error("Exception creating mobile user:", err);
      return { success: false, error: "Failed to create mobile user" };
    }
  }

  // Deactivate mobile user (when safe is deactivated)
  async deactivateMobileUser(
    safeId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("mobile_users")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("safe_id", safeId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: "Failed to deactivate mobile user" };
    }
  }

  // Get mobile user for safe
  async getMobileUserBySafe(safeId: string) {
    try {
      const { data, error } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("safe_id", safeId)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        // Not found is ok
        console.error("Failed to get mobile user:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception getting mobile user:", err);
      return null;
    }
  }
}

export const mobileUserService = new MobileUserService();
