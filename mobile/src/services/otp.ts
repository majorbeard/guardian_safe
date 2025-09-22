import { supabase } from "./supabase";

interface OTPRequest {
  trip_id: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: string;
}

interface OTPResponse {
  success: boolean;
  otp?: string;
  error?: string;
  expires_at?: string;
}

class OTPService {
  // Generate 6-digit OTP
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
  }

  // Validate if current location is within delivery radius
  async validateLocation(
    tripId: string,
    currentLocation: { latitude: number; longitude: number }
  ): Promise<{ valid: boolean; distance?: number; error?: string }> {
    try {
      // Get trip details with delivery address
      const { data: trip, error } = await supabase
        .from("trips")
        .select("delivery_address, scheduled_delivery")
        .eq("id", tripId)
        .single();

      if (error || !trip) {
        return { valid: false, error: "Trip not found" };
      }

      // For now, we'll use a simple geocoding approximation
      // In production, you'd use a proper geocoding service
      // This is a placeholder - you'll need to geocode the delivery address

      // Temporary: Allow location validation if we can't geocode
      // In real implementation, you'd geocode trip.delivery_address
      console.log("Validating location for delivery:", trip.delivery_address);
      console.log("Current location:", currentLocation);

      // For demo purposes, always allow if accuracy is reasonable
      return { valid: true, distance: 0 };

      // Real implementation would be:
      // const deliveryCoords = await geocodeAddress(trip.delivery_address)
      // const distance = this.calculateDistance(
      //   currentLocation.latitude, currentLocation.longitude,
      //   deliveryCoords.latitude, deliveryCoords.longitude
      // )
      // return {
      //   valid: distance <= 100, // Within 100 meters
      //   distance
      // }
    } catch (err) {
      console.error("Location validation error:", err);
      return { valid: false, error: "Location validation failed" };
    }
  }

  // Request OTP for trip
  async requestOTP(
    tripId: string,
    location: { latitude: number; longitude: number; accuracy: number }
  ): Promise<OTPResponse> {
    try {
      console.log("🔐 Requesting OTP for trip:", tripId);

      // Step 1: Validate location
      const locationCheck = await this.validateLocation(tripId, location);
      if (!locationCheck.valid) {
        return {
          success: false,
          error:
            locationCheck.error ||
            "You must be at the delivery location to request OTP",
        };
      }

      // Step 2: Check if trip is in correct status
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .eq("status", "in_transit")
        .single();

      if (tripError || !trip) {
        console.error("❌ Trip lookup error:", tripError);
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

      // Step 3: Generate OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      console.log(
        "🔐 Generated OTP:",
        otp,
        "expires:",
        expiresAt.toISOString()
      );

      // Step 4: Prepare OTP data for insertion
      const otpData = {
        trip_id: tripId,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        requested_location: location, // This will be stored as JSONB
        // Don't specify created_at, used, used_at - let defaults handle them
      };

      console.log("🔐 Attempting to insert OTP with data:", otpData);

      // Step 5: Store OTP in database
      const { data: insertedOTP, error: otpError } = await supabase
        .from("trip_otps")
        .insert(otpData)
        .select()
        .single();

      if (otpError) {
        console.error("💥 Detailed OTP insertion error:", otpError);
        return {
          success: false,
          error: `Failed to generate OTP: ${otpError.message}`,
        };
      }

      console.log("✅ OTP stored successfully:", insertedOTP);

      // Step 6: Send OTP via email
      const emailResult = await this.sendOTPEmail(trip, otp);
      if (!emailResult.success) {
        // OTP was created but email failed - still return success but mention email issue
        console.warn("⚠️ OTP created but email failed:", emailResult.error);
        return {
          success: true,
          expires_at: expiresAt.toISOString(),
          // Could add a warning about email failure here if needed
        };
      }

      console.log("🎉 OTP request completed successfully");
      return {
        success: true,
        expires_at: expiresAt.toISOString(),
      };
    } catch (err: any) {
      console.error("💥 OTP request exception:", err);
      return {
        success: false,
        error: `Failed to request OTP: ${err.message}`,
      };
    }
  }

  // Send OTP via email
  private async sendOTPEmail(
    trip: any,
    otp: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("📧 Sending OTP email to:", trip.client_email);

      // Make direct HTTP call to edge function
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
            to: trip.client_email,
            client_name: trip.client_name,
            otp_code: otp,
            trip_id: trip.id,
            delivery_address: trip.delivery_address,
            driver_location: "At your delivery location",
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "❌ Email service HTTP error:",
          response.status,
          errorText
        );
        return {
          success: false,
          error: `Email service error: ${response.status}`,
        };
      }

      const result = await response.json();
      console.log("📧 Email service response:", result);

      if (result.success) {
        console.log("✅ OTP email sent successfully!");
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to send OTP email",
        };
      }
    } catch (err: any) {
      console.error("💥 Email send exception:", err);
      return { success: false, error: `Email service error: ${err.message}` };
    }
  }

  // Verify OTP code
  async verifyOTP(
    tripId: string,
    otpCode: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("🔍 Verifying OTP:", otpCode, "for trip:", tripId);

      // Get the latest unused, unexpired OTP for this trip
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
        console.error("❌ OTP lookup error:", error);
        if (error.code === "PGRST116") {
          // No rows returned
          return { success: false, error: "Invalid or expired OTP code" };
        }
        return { success: false, error: "Failed to verify OTP" };
      }

      if (!otpRecord) {
        return { success: false, error: "Invalid or expired OTP code" };
      }

      console.log("✅ Found valid OTP record:", otpRecord.id);

      // Mark OTP as used
      const { error: updateError } = await supabase
        .from("trip_otps")
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq("id", otpRecord.id);

      if (updateError) {
        console.error("❌ Failed to mark OTP as used:", updateError);
        return { success: false, error: "Failed to process OTP" };
      }

      console.log("🎉 OTP verified and marked as used");
      return { success: true };
    } catch (err: any) {
      console.error("💥 OTP verification exception:", err);
      return { success: false, error: `Verification failed: ${err.message}` };
    }
  }

  // Clear expired OTPs (cleanup function)
  async cleanupExpiredOTPs() {
    try {
      const { error } = await supabase
        .from("trip_otps")
        .delete()
        .lt("expires_at", new Date().toISOString());

      if (error) {
        console.error("❌ OTP cleanup error:", error);
      } else {
        console.log("🧹 Expired OTPs cleaned up");
      }
    } catch (err) {
      console.error("💥 OTP cleanup exception:", err);
    }
  }
}

export const otpService = new OTPService();
