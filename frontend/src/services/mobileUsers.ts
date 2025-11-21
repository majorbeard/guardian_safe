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
  generateUsername(serialNumber: string): string {
    return serialNumber.toLowerCase().replace(/[^a-z0-9]/g, "") + "_driver";
  }

  generatePassword(): string {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // Hash password using Edge Function
  private async hashPassword(password: string): Promise<string> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Authentication required");
    }

    const { data, error } = await supabase.functions.invoke("hash-password", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: { password },
    });

    if (error || !data?.hash) {
      console.error("Password hashing failed:", error);
      throw new Error("Failed to hash password");
    }

    return data.hash;
  }

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
      const username = this.generateUsername(serialNumber);
      const password = this.generatePassword();

      // Hash password via Edge Function
      const passwordHash = await this.hashPassword(password);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: "User not authenticated" };
      }

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

  async getMobileUserBySafe(safeId: string) {
    try {
      const { data, error } = await supabase
        .from("mobile_users")
        .select("*")
        .eq("safe_id", safeId)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
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
