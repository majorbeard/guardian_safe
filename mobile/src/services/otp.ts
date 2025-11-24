import { supabase } from "./supabase";
import { mobileAuthService } from "./auth";

interface OTPResponse {
  success: boolean;
  otp?: string;
  error?: string;
  expires_at?: string;
}

class OTPService {
  private lastOTPRequest: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 30000; // 30 seconds

  async requestOTP(
    tripId: string,
    location: { latitude: number; longitude: number; accuracy: number }
  ): Promise<OTPResponse> {
    try {
      const now = Date.now();
      if (now - this.lastOTPRequest < this.MIN_REQUEST_INTERVAL) {
        const waitTime = Math.ceil(
          (this.MIN_REQUEST_INTERVAL - (now - this.lastOTPRequest)) / 1000
        );
        return {
          success: false,
          error: `Please wait ${waitTime} seconds before requesting another code`,
        };
      }

      console.log("Requesting OTP for trip:", tripId);

      const sessionToken = await mobileAuthService.getSessionToken();

      console.log("Session token retrieved:", sessionToken ? "YES" : "NO");

      if (!sessionToken) {
        return {
          success: false,
          error: "Session expired. Please login again.",
        };
      }

      const { data, error } = await supabase.functions.invoke("mobile-otp", {
        body: {
          session_token: sessionToken, // Pass in body instead of header
          action: "request_otp",
          trip_id: tripId,
          location: location,
        },
      });

      console.log("Edge function response:", data);
      console.log("Edge function error:", error);

      if (error) {
        console.error("OTP request error:", error);
        // Try to extract the error message from the response body if available
        const errorMessage = data?.error || error.message || "Failed to request OTP";
        return {
          success: false,
          error: errorMessage,
        };
      }

      if (!data.success) {
        console.error("OTP request failed:", data.error);
        return { success: false, error: data.error || "Failed to request OTP" };
      }

      this.lastOTPRequest = now;

      console.log("OTP request completed successfully");
      return {
        success: true,
        expires_at: data.expires_at,
      };
    } catch (err: any) {
      console.error("OTP request exception:", err);
      return {
        success: false,
        error: `Failed to request OTP: ${err.message}`,
      };
    }
  }

  async verifyOTP(
    tripId: string,
    otpCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("Verifying OTP for trip:", tripId);

      if (!/^\d{6}$/.test(otpCode)) {
        return { success: false, error: "Invalid OTP format" };
      }

      const sessionToken = await mobileAuthService.getSessionToken();

      if (!sessionToken) {
        return {
          success: false,
          error: "Session expired. Please login again.",
        };
      }

      const { data, error } = await supabase.functions.invoke("mobile-otp", {
        body: {
          session_token: sessionToken, // Pass in body instead of header
          action: "verify_otp",
          trip_id: tripId,
          otp_code: otpCode,
        },
      });

      if (error) {
        console.error("OTP verification error:", error);
        // Try to extract the error message from the response body if available
        const errorMessage = data?.error || error.message || "Failed to verify OTP";
        return {
          success: false,
          error: errorMessage,
        };
      }

      if (!data.success) {
        console.error("OTP verification failed:", data.error);
        return {
          success: false,
          error: data.error || "Invalid or expired OTP code",
        };
      }

      console.log("OTP verified successfully");
      return { success: true };
    } catch (err: any) {
      console.error("OTP verification exception:", err);
      return { success: false, error: `Verification failed: ${err.message}` };
    }
  }

  async cleanupExpiredOTPs() {
    try {
      const { error } = await supabase
        .from("trip_otps")
        .delete()
        .lt("expires_at", new Date().toISOString());

      if (error) {
        console.error("OTP cleanup error:", error);
      } else {
        console.log("Expired OTPs cleaned up");
      }
    } catch (err) {
      console.error("OTP cleanup exception:", err);
    }
  }
}

export const otpService = new OTPService();
