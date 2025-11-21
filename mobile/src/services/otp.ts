import { supabase } from "./supabase";

interface OTPResponse {
  success: boolean;
  otp?: string;
  error?: string;
  expires_at?: string;
}

class OTPService {
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async requestOTP(
    tripId: string,
    location: { latitude: number; longitude: number; accuracy: number }
  ): Promise<OTPResponse> {
    try {
      console.log("Requesting OTP for trip:", tripId);

      // Step 1: Check if trip is in correct status
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .eq("status", "in_transit")
        .single();

      if (tripError || !trip) {
        console.error("Trip lookup error:", tripError);
        return {
          success: false,
          error: "Trip must be in transit to request OTP",
        };
      }

      if (!trip.client_email) {
        return {
          success: false,
          error: "No recipient email found for this trip",
        };
      }

      // Step 2: Generate OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      console.log(
        "🔑 Generated OTP:",
        otp,
        "expires:",
        expiresAt.toISOString()
      );

      // Step 3: Store OTP in database
      const otpData = {
        trip_id: tripId,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        requested_location: location,
      };

      console.log("Storing OTP...");

      const { data: insertedOTP, error: otpError } = await supabase
        .from("trip_otps")
        .insert(otpData)
        .select()
        .single();

      if (otpError) {
        console.error("OTP insertion error:", otpError);
        return {
          success: false,
          error: `Failed to generate OTP: ${otpError.message}`,
        };
      }

      console.log("OTP stored successfully:", insertedOTP);

      // Step 4: Send OTP via email
      const emailResult = await this.sendOTPEmail(trip, otp);
      if (!emailResult.success) {
        console.warn("OTP created but email failed:", emailResult.error);
      }

      console.log("OTP request completed successfully");
      return {
        success: true,
        expires_at: expiresAt.toISOString(),
      };
    } catch (err: any) {
      console.error("OTP request exception:", err);
      return {
        success: false,
        error: `Failed to request OTP: ${err.message}`,
      };
    }
  }

  private async sendOTPEmail(
    trip: any,
    otp: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Send OTP to RECIPIENT (person receiving delivery)
      const recipientEmail = trip.recipient_email || trip.client_email;
      const recipientName = trip.recipient_name || trip.client_name;

      console.log("Sending OTP email to RECIPIENT:", recipientEmail);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-delivery-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
          body: JSON.stringify({
            to: recipientEmail,
            recipient_name: recipientName, // Changed from client_name
            client_name: trip.client_name, // Who booked it
            otp_code: otp,
            trip_id: trip.id,
            delivery_address: trip.delivery_address,
            driver_location: "At your delivery location",
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Email service HTTP error:", response.status, errorText);
        return {
          success: false,
          error: `Email service error: ${response.status}`,
        };
      }

      const result = await response.json();
      console.log("Email service response:", result);

      if (result.success) {
        console.log("OTP email sent successfully to recipient!");
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to send OTP email",
        };
      }
    } catch (err: any) {
      console.error("Email send exception:", err);
      return { success: false, error: `Email service error: ${err.message}` };
    }
  }

  async verifyOTP(
    tripId: string,
    otpCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("Verifying OTP:", otpCode, "for trip:", tripId);

      const { data: otpRecord, error } = await supabase
        .from("trip_otps")
        .select("*")
        .eq("trip_id", tripId)
        .eq("otp_code", otpCode)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error("OTP lookup error:", error);
        if (error.code === "PGRST116") {
          return { success: false, error: "Invalid or expired OTP code" };
        }
        return { success: false, error: "Failed to verify OTP" };
      }

      if (!otpRecord) {
        return { success: false, error: "Invalid or expired OTP code" };
      }

      console.log("Found valid OTP record:", otpRecord.id);

      // Mark OTP as used
      const { error: updateError } = await supabase
        .from("trip_otps")
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq("id", otpRecord.id);

      if (updateError) {
        console.error("Failed to mark OTP as used:", updateError);
        return { success: false, error: "Failed to process OTP" };
      }

      console.log("OTP verified and marked as used");
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
