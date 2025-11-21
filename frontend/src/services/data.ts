import { supabase } from "../lib/supabase";
import { dataActions } from "../store/data";
import { currentUser } from "../store/auth";
import type {
  Safe,
  Trip,
  SafeStatus,
  TripStatus,
  TripPriority,
} from "../types";

// Trip booking data interface
export interface TripBookingData {
  safe_id: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  pickup_address: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  delivery_address: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;

  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_is_client?: boolean; // Toggle: "Same as client"

  scheduled_pickup: string;
  scheduled_delivery: string;
  priority?: TripPriority;
  special_instructions?: string;
  delivery_notes?: string;
  requires_signature?: boolean;
  recurring?: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    end_date?: string;
    days_of_week?: number[];
  };
}

export interface TripValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

class DataService {
  private safesSubscription: any = null;
  private tripsSubscription: any = null;

  async loadUserData() {
    const user = currentUser.value;
    if (!user) return;

    dataActions.setLoading(true);

    try {
      // Load data - RLS automatically filters based on user
      await Promise.all([this.loadSafes(), this.loadTrips()]);
    } catch (error) {
      console.error("Failed to load user data:", error);
    } finally {
      dataActions.setLoading(false);
    }
  }

  async loadSafes() {
    // RLS handles filtering - owner sees all, admin sees assigned
    const { data, error } = await supabase
      .from("safes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load safes:", error);
      return;
    }

    dataActions.setSafes(data || []);
  }

  async loadTrips() {
    // RLS handles filtering automatically
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load trips:", error);
      return;
    }

    dataActions.setTrips(data || []);
  }

  async createSafe(safeData: {
    serial_number: string;
    device_hash: string;
    assigned_to: string;
    tracking_device_id?: string;
  }) {
    const { data, error } = await supabase
      .from("safes")
      .insert({
        ...safeData,
        status: "inactive",
        battery_level: 100,
        is_locked: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // No need to manually update store - real-time will handle it
    return { success: true, safe: data };
  }

  // Enhanced trip creation with validation and new fields
  async createTrip(tripData: any) {
    const user = currentUser.value;
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    console.log("📋 Creating trip with data:", tripData);

    // Determine recipient
    const recipientName = tripData.recipient_is_client
      ? tripData.client_name
      : tripData.recipient_name;

    const recipientEmail = tripData.recipient_is_client
      ? tripData.client_email
      : tripData.recipient_email;

    const recipientPhone = tripData.recipient_is_client
      ? tripData.client_phone
      : tripData.recipient_phone;

    // Client always gets tracking link
    const customerTrackingEnabled = !!tripData.client_email;

    const enhancedTripData = {
      ...tripData,
      created_by: user.id,
      status: "pending",
      priority: tripData.priority || "normal",
      requires_signature: tripData.requires_signature || false,
      customer_tracking_enabled: customerTrackingEnabled,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      recipient_phone: recipientPhone,
      recipient_is_client: tripData.recipient_is_client || false,
      ...(tripData.client_phone && { client_phone: tripData.client_phone }),
      ...(tripData.client_email && { client_email: tripData.client_email }),
      ...(tripData.pickup_contact_name && {
        pickup_contact_name: tripData.pickup_contact_name,
      }),
      ...(tripData.pickup_contact_phone && {
        pickup_contact_phone: tripData.pickup_contact_phone,
      }),
      ...(tripData.delivery_contact_name && {
        delivery_contact_name: tripData.delivery_contact_name,
      }),
      ...(tripData.delivery_contact_phone && {
        delivery_contact_phone: tripData.delivery_contact_phone,
      }),
      ...(tripData.delivery_notes && {
        delivery_notes: tripData.delivery_notes,
      }),
      ...(tripData.recurring?.enabled && {
        recurring_config: tripData.recurring,
      }),
    };

    delete enhancedTripData.recurring;

    try {
      console.log("💾 Inserting trip into database...");
      const { data, error } = await supabase
        .from("trips")
        .insert(enhancedTripData)
        .select("*, tracking_token")
        .single();

      if (error) {
        console.error("Supabase error:", error);
        return { success: false, error: error.message };
      }

      console.log("Trip created successfully:", data);

      // REPLACE the email section with this:
      if (enhancedTripData.client_email) {
        console.log("Sending booking confirmation to CLIENT...");

        // Fire and forget with timeout
        this.sendClientBookingConfirmation(data).catch((err) => {
          console.warn("Email failed (non-blocking):", err);
        });
      }

      // Return immediately, don't wait for email
      return { success: true, trip: data };
    } catch (err) {
      console.error("Exception creating trip:", err);
      return {
        success: false,
        error: "Failed to create trip booking. Please try again.",
      };
    }
  }

  // Validate trip data before submission
  validateTripData(
    data: TripBookingData,
    availableSafes: Safe[]
  ): TripValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!data.safe_id) errors.push("Safe selection is required");
    if (!data.client_name.trim()) errors.push("Client name is required");
    if (!data.pickup_address.trim()) errors.push("Pickup address is required");
    if (!data.delivery_address.trim())
      errors.push("Delivery address is required");
    if (!data.scheduled_pickup) errors.push("Pickup time is required");
    if (!data.scheduled_delivery) errors.push("Delivery time is required");

    // Safe availability validation
    const selectedSafe = availableSafes.find(
      (safe) => safe.id === data.safe_id
    );
    if (data.safe_id && !selectedSafe) {
      errors.push("Selected safe is not available");
    } else if (selectedSafe) {
      if (selectedSafe.status !== "active") {
        errors.push(`Safe ${selectedSafe.serial_number} is not active`);
      }
      if (selectedSafe.battery_level < 20) {
        warnings.push(
          `Safe ${selectedSafe.serial_number} has low battery (${selectedSafe.battery_level}%)`
        );
      }
    }

    // Time validation
    const now = new Date();
    const pickupTime = new Date(data.scheduled_pickup);
    const deliveryTime = new Date(data.scheduled_delivery);

    if (pickupTime <= now) {
      errors.push("Pickup time must be in the future");
    }

    if (deliveryTime <= pickupTime) {
      errors.push("Delivery time must be after pickup time");
    }

    const timeDiff = deliveryTime.getTime() - pickupTime.getTime();
    const minDuration = 30 * 60 * 1000; // 30 minutes minimum

    if (timeDiff < minDuration) {
      errors.push("Minimum trip duration is 30 minutes");
    }

    // Contact validation
    if (data.client_phone && !this.isValidPhone(data.client_phone)) {
      errors.push("Invalid client phone number");
    }

    if (data.client_email && !this.isValidEmail(data.client_email)) {
      errors.push("Invalid client email address");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Check for scheduling conflicts
  async checkSchedulingConflicts(
    safeId: string,
    pickupTime: string,
    deliveryTime: string,
    excludeTripId?: string
  ): Promise<any[]> {
    try {
      console.log("Checking conflicts for:", {
        safeId,
        pickupTime,
        deliveryTime,
        excludeTripId,
      });

      let query = supabase
        .from("trips")
        .select("id, client_name, scheduled_pickup, scheduled_delivery")
        .eq("safe_id", safeId)
        .in("status", ["pending", "in_transit"]);

      if (excludeTripId) {
        query = query.neq("id", excludeTripId);
      }

      console.log("📡 Executing Supabase query...");
      const { data, error } = await query;

      if (error) {
        console.error("Conflict check query error:", error);
        return [];
      }

      console.log("Conflict check results:", data);

      if (!data || data.length === 0) {
        console.log("No existing trips to conflict with");
        return [];
      }

      const newPickup = new Date(pickupTime);
      const newDelivery = new Date(deliveryTime);

      console.log("📅 New trip times:", { newPickup, newDelivery });

      const conflicts = data.filter((trip) => {
        const existingPickup = new Date(trip.scheduled_pickup);
        const existingDelivery = new Date(trip.scheduled_delivery);

        // Check for time overlap
        const hasConflict =
          newPickup < existingDelivery && newDelivery > existingPickup;

        if (hasConflict) {
          console.log("⚠️ Conflict found with trip:", trip.id);
        }

        return hasConflict;
      });

      console.log(
        `Conflict check complete: ${conflicts.length} conflicts found`
      );
      return conflicts;
    } catch (error) {
      console.error("Exception in conflict check:", error);
      // Don't block trip creation on conflict check errors
      return [];
    }
  }

  // Generate customer tracking URL
  // Around line 360
  generateTrackingUrl(trackingToken: string): string {
    // Use environment variable or fallback to window.location
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}/track/${trackingToken}`;
  }

  async getTripByTrackingToken(trackingToken: string) {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select(
          `
        id,
        client_name,
        pickup_address,
        delivery_address,
        status,
        scheduled_pickup,
        scheduled_delivery,
        actual_pickup_time,
        actual_delivery_time,
        priority,
        special_instructions,
        requires_signature,
        created_at,
        updated_at,
        safe_id,
        safes!inner(
          id,
          serial_number,
          status,
          battery_level,
          last_update,
          tracknetics_device_id,
          tracking_device_id
        )
      `
        )
        .eq("tracking_token", trackingToken)
        .eq("customer_tracking_enabled", true)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Transform the data to match our interface (safes is returned as array, we need single object)
      const transformedData = {
        ...data,
        safes: Array.isArray(data.safes) ? data.safes[0] : data.safes,
      };

      return { success: true, trip: transformedData };
    } catch (err: any) {
      console.error("Error fetching trip by tracking token:", err);
      return { success: false, error: "Failed to load tracking information" };
    }
  }

  // Enable/disable customer tracking for a trip
  async toggleCustomerTracking(tripId: string, enabled: boolean) {
    try {
      const { data, error } = await supabase
        .from("trips")
        .update({
          customer_tracking_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, trip: data };
    } catch (err) {
      console.error("Error toggling customer tracking:", err);
      return { success: false, error: "Failed to update tracking settings" };
    }
  }

  async updateSafeStatus(safeId: string, updates: { status: SafeStatus }) {
    const { data, error } = await supabase
      .from("safes")
      .update(updates)
      .eq("id", safeId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, safe: data };
  }

  async updateTripStatus(tripId: string, status: TripStatus) {
    const { data, error } = await supabase
      .from("trips")
      .update({
        status,
        updated_at: new Date().toISOString(),
        // Set actual times when status changes
        ...(status === "in_transit" && {
          actual_pickup_time: new Date().toISOString(),
        }),
        ...(status === "delivered" && {
          actual_delivery_time: new Date().toISOString(),
        }),
      })
      .eq("id", tripId)
      .select("*, safes(serial_number)")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Send status update email if customer tracking is enabled
    if (data.customer_tracking_enabled && data.client_email) {
      await this.sendStatusUpdateEmail(data, status);
    }

    return { success: true, trip: data };
  }

  // Send status update email
  private async sendStatusUpdateEmail(trip: any, newStatus: string) {
    try {
      console.log(
        `Sending status update email: ${newStatus} to ${trip.client_email}`
      );

      const statusMessages = {
        in_transit:
          "Your items have been securely collected and are now in transit",
        delivered: "Your secure transport has been completed successfully",
        cancelled: "Your secure transport has been cancelled",
      };

      // Get current session for auth headers
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { error } = await supabase.functions.invoke(
        "send-customer-tracking", // Reuse same function
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: {
            to: trip.client_email,
            trip_id: trip.id,
            client_name: trip.client_name,
            pickup_address: trip.pickup_address,
            delivery_address: trip.delivery_address,
            scheduled_pickup: trip.scheduled_pickup,
            scheduled_delivery: trip.scheduled_delivery,
            special_instructions: trip.special_instructions,
            priority: trip.priority || "normal",
            tracking_url: this.generateTrackingUrl(trip.tracking_token),
            status_update: true, // Flag for status update email
            new_status: newStatus,
            status_message:
              statusMessages[newStatus as keyof typeof statusMessages],
          },
        }
      );

      if (error) {
        console.error("Error sending status update email:", error);
      } else {
        console.log("Status update email sent successfully");
      }
    } catch (error) {
      console.error("Exception sending status update email:", error);
    }
  }

  // Update an existing trip
  async updateTrip(
    tripId: string,
    updates: Partial<TripBookingData>
  ): Promise<{ success: boolean; trip?: Trip; error?: string }> {
    try {
      // If updating schedule, check for conflicts
      if (
        updates.safe_id ||
        updates.scheduled_pickup ||
        updates.scheduled_delivery
      ) {
        const { data: currentTrip } = await supabase
          .from("trips")
          .select("safe_id, scheduled_pickup, scheduled_delivery")
          .eq("id", tripId)
          .single();

        if (currentTrip) {
          const safeId = updates.safe_id || currentTrip.safe_id;
          const pickupTime =
            updates.scheduled_pickup || currentTrip.scheduled_pickup;
          const deliveryTime =
            updates.scheduled_delivery || currentTrip.scheduled_delivery;

          const conflicts = await this.checkSchedulingConflicts(
            safeId,
            pickupTime,
            deliveryTime,
            tripId
          );

          if (conflicts.length > 0) {
            return {
              success: false,
              error: `Scheduling conflict detected with existing trip`,
            };
          }
        }
      }

      const { data: updatedTrip, error } = await supabase
        .from("trips")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, trip: updatedTrip };
    } catch (error) {
      console.error("Error updating trip:", error);
      return {
        success: false,
        error: "Failed to update trip. Please try again.",
      };
    }
  }

  // Cancel a trip
  async cancelTrip(
    tripId: string,
    cancelReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("trips")
        .update({
          status: "cancelled",
          cancellation_reason: cancelReason,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error cancelling trip:", error);
      return {
        success: false,
        error: "Failed to cancel trip. Please try again.",
      };
    }
  }

  // Setup automatic real-time subscriptions
  setupRealtimeSubscriptions() {
    const user = currentUser.value;
    if (!user) return;

    // Subscribe to safes - RLS filters automatically
    this.safesSubscription = supabase
      .channel("safes-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "safes" },
        (payload) => {
          console.log("Safe update:", payload);
          if (payload.eventType === "INSERT") {
            dataActions.addSafe(payload.new as Safe);
          } else if (payload.eventType === "UPDATE") {
            dataActions.updateSafe(
              payload.new.id,
              payload.new as Partial<Safe>
            );
          }
        }
      )
      .subscribe();

    // Subscribe to trips - RLS filters automatically
    this.tripsSubscription = supabase
      .channel("trips-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        (payload) => {
          console.log("Trip update:", payload);
          if (payload.eventType === "INSERT") {
            dataActions.addTrip(payload.new as Trip);
          } else if (payload.eventType === "UPDATE") {
            dataActions.updateTrip(
              payload.new.id,
              payload.new as Partial<Trip>
            );
          }
        }
      )
      .subscribe();
  }

  cleanup() {
    // Clean up subscriptions
    if (this.safesSubscription) {
      supabase.removeChannel(this.safesSubscription);
    }
    if (this.tripsSubscription) {
      supabase.removeChannel(this.tripsSubscription);
    }
  }

  // Utility functions
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    // Remove spaces, dashes, parentheses for validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

    const southAfricanPatterns = [
      /^0[7-8][0-9]\d{7}$/, // Mobile: 071, 072, etc (10 digits total)
      /^0[1-6]\d{8}$/, // Landline: 010, 011, etc (10 digits total)
      /^\+27[7-8][0-9]\d{7}$/, // International mobile: +27 71, +27 82, etc
      /^\+27[1-6]\d{8}$/, // International landline: +27 11, +27 21, etc
      /^27[7-8][0-9]\d{7}$/, // International mobile without +: 27 71, 27 82, etc
      /^27[1-6]\d{8}$/, // International landline without +: 27 11, 27 21, etc
    ];

    // Test against South African patterns
    for (const pattern of southAfricanPatterns) {
      if (pattern.test(cleanPhone)) {
        return true;
      }
    }

    // Fallback: Allow any reasonable phone number format (more permissive)
    // This catches any other valid international formats
    const generalPattern = /^[\+]?[\d\s\-\(\)]{7,15}$/;
    return generalPattern.test(cleanPhone);
  }

  // 1. CLIENT: Booking confirmation
  private async sendClientBookingConfirmation(trip: Trip) {
    try {
      if (!trip.client_email) return;

      console.log(
        "📧 Sending booking confirmation to client:",
        trip.client_email
      );

      const trackingUrl =
        trip.customer_tracking_enabled && trip.tracking_token
          ? this.generateTrackingUrl(trip.tracking_token)
          : null;

      const emailPromise = supabase.functions.invoke(
        "send-client-booking-confirmation",
        {
          body: {
            to: trip.client_email,
            client_name: trip.client_name,
            trip_id: trip.id,
            pickup_address: trip.pickup_address,
            delivery_address: trip.delivery_address,
            recipient_name: trip.recipient_name,
            scheduled_pickup: trip.scheduled_pickup,
            scheduled_delivery: trip.scheduled_delivery,
            tracking_url: trackingUrl, // ✅ This now uses production URL
            priority: trip.priority || "normal",
          },
        }
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );

      await Promise.race([emailPromise, timeoutPromise]).catch(() => {
        console.warn("📧 Email timeout - continuing anyway");
      });
    } catch (error) {
      console.error("📧 Client email error (non-blocking):", error);
    }
  }

  // 2. RECIPIENT: Driver arriving notification
  // (Called from mobile app when driver clicks "I've Arrived")
  async sendRecipientArrivalNotification(trip: Trip) {
    try {
      if (!trip.recipient_email) return;

      console.log(
        "📧 Sending arrival notification to recipient:",
        trip.recipient_email
      );

      // OPTIONAL: Include tracking link for recipient
      // const trackingUrl = this.generateTrackingUrl(trip.tracking_token);

      const emailPromise = supabase.functions.invoke("send-recipient-arrival", {
        body: {
          to: trip.recipient_email,
          recipient_name: trip.recipient_name,
          delivery_address: trip.delivery_address,
          client_name: trip.client_name,
          // tracking_url: trackingUrl, // OPTIONAL
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000)
      );

      await Promise.race([emailPromise, timeoutPromise]).catch(() => {
        console.warn("Email timeout - continuing");
      });
    } catch (error) {
      console.error("Recipient arrival email error:", error);
    }
  }

  // 3. CLIENT: Delivery completed confirmation
  async sendClientDeliveryConfirmation(trip: Trip) {
    try {
      if (!trip.client_email) return;

      console.log(
        "Sending delivery confirmation to client:",
        trip.client_email
      );

      const emailPromise = supabase.functions.invoke(
        "send-delivery-confirmation",
        {
          body: {
            to: trip.client_email,
            client_name: trip.client_name,
            trip_id: trip.id,
            recipient_name: trip.recipient_name,
            delivery_address: trip.delivery_address,
            delivered_at: new Date().toISOString(),
          },
        }
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000)
      );

      await Promise.race([emailPromise, timeoutPromise]).catch(() => {
        console.warn("Email timeout - continuing");
      });
    } catch (error) {
      console.error("Delivery confirmation email error:", error);
    }
  }
}

export const dataService = new DataService();
