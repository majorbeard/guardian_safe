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
        try {
          const userProfile = await this.getUserProfile(session.user.id);
          if (userProfile) {
            authActions.setUser(userProfile);
          } else {
            console.log("No profile found for user, logging out");
            await supabase.auth.signOut();
            authActions.setLoading(false);
          }
        } catch (profileError) {
          console.error("Error fetching user profile:", profileError);
          await supabase.auth.signOut();
          authActions.setLoading(false);
        }
      } else {
        authActions.setLoading(false);
      }

      // Listen for auth changes - Supabase handles this automatically
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          try {
            const userProfile = await this.getUserProfile(session.user.id);
            if (userProfile) {
              authActions.setUser(userProfile);
            } else {
              console.log("No profile found after sign in");
              await supabase.auth.signOut();
            }
          } catch (profileError) {
            console.error(
              "Error fetching profile after sign in:",
              profileError
            );
            await supabase.auth.signOut();
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
        .from("profiles") // Using profiles table
        .update({ must_change_password: false })
        .eq("id", user.id);

      authActions.updateUser({ must_change_password: false });
    }

    return { success: true };
  }

  // Create users using signup with email verification
  async createUser(userData: {
    email: string;
    username: string;
    password: string;
    role: "admin";
    created_by?: string;
  }) {
    try {
      // Use sign up with email verification instead of admin creation
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            role: userData.role,
            must_change_password: true,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        user: data.user,
        message:
          "User created! They will receive a confirmation email to activate their account.",
      };
    } catch (err) {
      console.error("Signup error:", err);
      return {
        success: false,
        error: "Failed to create user. Please try again.",
      };
    }
  }

  private async getUserProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .eq("is_active", true)
        .single();

      if (error) {
        console.error("Failed to get user profile:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception getting user profile:", err);
      return null;
    }
  }
}

export const authService = new AuthService();
