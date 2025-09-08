import { supabase } from "../lib/supabase";
import { authActions } from "../store/auth";
import type { User } from "../types";

class AuthService {
  async initialize() {
    authActions.setLoading(true);

    try {
      // Get current session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth session error:", error);
        authActions.setLoading(false);
        return;
      }

      if (session?.user) {
        const userProfile = await this.getUserProfile(session.user.id);
        if (userProfile) {
          authActions.setUser(userProfile);
        } else {
          authActions.setLoading(false);
        }
      } else {
        authActions.setLoading(false);
      }

      // Listen for auth changes - Supabase handles this automatically
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const userProfile = await this.getUserProfile(session.user.id);
          if (userProfile) {
            authActions.setUser(userProfile);
          }
        } else if (event === "SIGNED_OUT") {
          authActions.logout();
        }
      });
    } catch (error) {
      console.error("Auth initialization failed:", error);
      authActions.setLoading(false);
    }
  }

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      const userProfile = await this.getUserProfile(data.user.id);
      if (userProfile) {
        return {
          success: true,
          requiresPasswordChange: userProfile.must_change_password,
        };
      }
    }

    return { success: false, error: "User profile not found" };
  }

  async logout() {
    await supabase.auth.signOut();
  }

  async changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Update must_change_password flag using RLS-protected update
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles") // Using profiles table instead of users
        .update({ must_change_password: false })
        .eq("id", user.id);

      authActions.updateUser({ must_change_password: false });
    }

    return { success: true };
  }

  // Owner creates admin users through Supabase Auth Admin API
  async inviteUser(
    email: string,
    userData: {
      username: string;
      role: "admin";
    }
  ) {
    // Send invite email - user sets their own password
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        username: userData.username,
        role: userData.role,
        must_change_password: false, // They set password via invite
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  private async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }
}

export const authService = new AuthService();
