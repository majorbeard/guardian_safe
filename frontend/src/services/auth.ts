import { supabase } from "../lib/supabase";
import { authActions } from "../store/auth";
import { toast } from "../components/Toast";
import type { User } from "../types";
import { logger } from "../utils/logger";

class AuthService {
  private isInitializing = false;

  // Check rate limit before login
  private async checkRateLimit(email: string): Promise<{
    allowed: boolean;
    retryAfter?: number;
    message?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "rate-limit-check",
        {
          body: {
            identifier: email.toLowerCase(),
            attempt_type: "login",
            action: "check",
          },
        }
      );

      if (error || !data) {
        console.warn("Rate limit check failed, allowing attempt");
        return { allowed: true };
      }

      if (data.is_blocked) {
        const minutes = Math.ceil(data.retry_after / 60);
        return {
          allowed: false,
          retryAfter: data.retry_after,
          message: `Too many login attempts. Please try again in ${minutes} minute${
            minutes !== 1 ? "s" : ""
          }.`,
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error("Rate limit check error:", error);
      return { allowed: true }; // Fail open
    }
  }

  // Log login attempt
  private async logLoginAttempt(email: string, success: boolean) {
    try {
      await supabase.functions.invoke("rate-limit-check", {
        body: {
          identifier: email.toLowerCase(),
          attempt_type: "login",
          action: "log",
          success,
          ip_address: null, // Edge function will detect this
          user_agent: navigator.userAgent,
        },
      });
    } catch (error) {
      console.warn("Failed to log login attempt:", error);
      // Don't block on logging failures
    }
  }

  async initialize() {
    if (this.isInitializing) {
      console.log("Auth already initializing, skipping...");
      return;
    }

    this.isInitializing = true;
    authActions.setLoading(true);

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth session error:", error);

        // Clear invalid session
        if (error.message.includes("Refresh Token")) {
          console.log("Clearing invalid session");
          await this.clearSession();
        }

        authActions.setLoading(false);
        this.isInitializing = false;
        return;
      }

      if (session?.user) {
        try {
          const userProfile = await this.getUserProfile(session.user.id);
          if (userProfile) {
            authActions.setUser(userProfile);
          } else {
            console.log("No profile found for user, clearing session");
            await this.clearSession();
          }
        } catch (profileError: any) {
          console.error("Error fetching user profile:", profileError);

          // If it's an auth error, clear session
          if (
            profileError.message?.includes("JWT") ||
            profileError.message?.includes("session")
          ) {
            await this.clearSession();
          }
        }
      }

      authActions.setLoading(false);

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth state changed:", event);

        if (event === "SIGNED_IN" && session?.user) {
          try {
            const userProfile = await this.getUserProfile(session.user.id);
            if (userProfile) {
              authActions.setUser(userProfile);
            } else {
              console.log("No profile found after sign in");
              await this.clearSession();
            }
          } catch (profileError) {
            console.error(
              "Error fetching profile after sign in:",
              profileError
            );
            await this.clearSession();
          }
        } else if (event === "SIGNED_OUT") {
          authActions.logout();
        } else if (event === "TOKEN_REFRESHED") {
          console.log("Token refreshed successfully");
        } else if (event === "USER_UPDATED") {
          console.log("User updated");
        }
      });
    } catch (error) {
      console.error("Auth initialization failed:", error);
      authActions.setLoading(false);
    } finally {
      this.isInitializing = false;
    }
  }

  // Clear invalid session
  private async clearSession() {
    try {
      await supabase.auth.signOut();
      authActions.logout();

      // Clear local storage items related to Supabase
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.includes("supabase")) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Error clearing session:", error);
    }
  }

  async login(email: string, password: string) {
    logger.info("Login attempt", { email });

    const rateLimitCheck = await this.checkRateLimit(email);
    if (!rateLimitCheck.allowed) {
      logger.warn("Login blocked by rate limit", { email });
      toast.error(rateLimitCheck.message!);
      return { success: false, error: rateLimitCheck.message };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      await this.logLoginAttempt(email, !error);

      if (error) {
        logger.error("Login failed", { email, error: error.message });
        toast.error("Invalid email or password");
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userProfile = await this.getUserProfile(data.user.id);
        if (userProfile) {
          logger.info("Login successful", {
            userId: data.user.id,
            role: userProfile.role,
          });
          toast.success("Login successful!");
          return {
            success: true,
            requiresPasswordChange: userProfile.must_change_password,
          };
        }
      }

      logger.error("Login failed - no profile", { email });
      toast.error("User profile not found");
      return { success: false, error: "User profile not found" };
    } catch (error: any) {
      logger.error("Login exception", { email, error: error.message });
      toast.error("Login failed. Please try again.");
      return { success: false, error: error.message || "Login failed" };
    }
  }

  async logout() {
    try {
      await supabase.auth.signOut();
      toast.info("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      authActions.logout();
    }
  }

  async changePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error("Failed to change password");
        return { success: false, error: error.message };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", user.id);

        authActions.updateUser({ must_change_password: false });
      }

      toast.success("Password changed successfully!");
      return { success: true };
    } catch (error: any) {
      console.error("Change password error:", error);
      toast.error("Failed to change password");
      return { success: false, error: error.message };
    }
  }

  async createUser(userData: {
    email: string;
    username: string;
    password: string;
    role: "admin" | "owner";
    created_by?: string;
    must_change_password?: boolean;
  }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            role: userData.role,
            must_change_password: userData.must_change_password ?? true,
          },
          emailRedirectTo: `${window.location.origin}`,
        },
      });

      if (error) {
        toast.error("Failed to create user");
        return { success: false, error: error.message };
      }

      toast.success("User created successfully!");
      return {
        success: true,
        user: data.user,
        message:
          "User created! They will receive a confirmation email to activate their account.",
      };
    } catch (err: any) {
      console.error("Signup error:", err);
      toast.error("Failed to create user");
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

        // Don't throw on PGRST116 (no rows) - just return null
        if (error.code === "PGRST116") {
          console.log("No profile found for user");
          return null;
        }

        // If permission denied, this means RLS is blocking
        if (error.code === "42501") {
          console.error("RLS permission denied - this should not happen");
          // Log out to clear bad state
          throw new Error("Invalid session");
        }

        return null;
      }

      return data;
    } catch (err: any) {
      console.error("Exception getting user profile:", err);
      throw err;
    }
  }
}

export const authService = new AuthService();
