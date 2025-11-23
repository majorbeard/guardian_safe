import { supabase } from "./supabase";
import { currentUser } from "../store/auth";
import { tripsActions } from "../store/trips";
import { mobileAuthService } from "./auth";

interface TripData {
  id: string;
  safe_id: string;
  client_name: string;
  client_email?: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_is_client?: boolean;
  pickup_address: string;
  delivery_address: string;
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  scheduled_pickup: string;
  scheduled_delivery: string;
  special_instructions?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  requires_signature?: boolean;
  created_at: string;
  updated_at: string;
}

class TripsService {
  private subscription: any = null;

  async loadTrips() {
    const user = currentUser.value;
    if (!user?.safe_id) {
      console.log("No user or safe_id found:", user);
      return;
    }

    // Verify session is still valid
    const sessionToken = mobileAuthService.getSessionToken();
    if (!sessionToken) {
      console.log("Session expired, logging out");
      await mobileAuthService.logout();
      return;
    }

    console.log("Loading trips for safe_id:", user.safe_id);
    tripsActions.setLoading(true);

    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("safe_id", user.safe_id)
        .in("status", ["pending", "in_transit"])
        .order("scheduled_pickup", { ascending: true });

      console.log("Trips query result:", data);
      console.log("Trips query error:", error);

      if (error) {
        console.error("Failed to load trips:", error);

        // If unauthorized, session might be invalid
        if (error.code === "PGRST301" || error.message?.includes("JWT")) {
          console.log("Session invalid, logging out");
          await mobileAuthService.logout();
          return;
        }

        tripsActions.setError("Failed to load trips");
        return;
      }

      console.log(`Found ${data?.length || 0} trips`);
      tripsActions.setTrips(data || []);
    } catch (err) {
      console.error("Exception loading trips:", err);
      tripsActions.setError("Failed to load trips");
    } finally {
      tripsActions.setLoading(false);
    }
  }

  async startTrip(tripId: string) {
    try {
      const sessionToken = mobileAuthService.getSessionToken();

      const { data, error } = await supabase.functions.invoke(
        "mobile-trip-action",
        {
          headers: {
            "x-session-token": sessionToken || "",
          },
          body: {
            action: "start_trip",
            trip_id: tripId,
          },
        }
      );

      if (error || !data.success) {
        console.error("Failed to start trip:", error || data.error);
        return {
          success: false,
          error: data?.error || error?.message || "Failed to start trip",
        };
      }

      tripsActions.updateTrip(tripId, data.trip);
      await this.logActivity("trip_started", tripId, "Trip started");

      return { success: true, trip: data.trip };
    } catch (err: any) {
      console.error("Error starting trip:", err);
      return { success: false, error: "Failed to start trip" };
    }
  }

  async completeTrip(tripId: string) {
    console.log("Attempting to complete trip:", tripId);

    try {
      const sessionToken = mobileAuthService.getSessionToken();

      if (!sessionToken) {
        return {
          success: false,
          error: "Session expired. Please login again.",
        };
      }

      const { data, error } = await supabase.functions.invoke(
        "mobile-trip-action",
        {
          headers: {
            "x-session-token": sessionToken,
          },
          body: {
            action: "complete_trip",
            trip_id: tripId,
          },
        }
      );

      console.log("Complete trip response:", data);
      console.log("Complete trip error:", error);

      if (error) {
        console.error("Edge function error:", error);
        return {
          success: false,
          error: error.message || "Failed to complete trip",
        };
      }

      if (!data.success) {
        console.error("Failed to complete trip:", data.error);
        return {
          success: false,
          error: data.error || "Failed to complete trip",
        };
      }

      console.log("Trip completed successfully!");

      // Send delivery confirmation to CLIENT
      if (data.trip.client_email) {
        console.log(
          "Sending delivery confirmation to client:",
          data.trip.client_email
        );

        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const response = await fetch(
            `${supabaseUrl}/functions/v1/send-delivery-confirmation`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${anonKey}`,
                apikey: anonKey,
              },
              body: JSON.stringify({
                to: data.trip.client_email,
                client_name: data.trip.client_name,
                recipient_name:
                  data.trip.recipient_name || data.trip.client_name,
                trip_id: data.trip.id,
                delivery_address: data.trip.delivery_address,
                delivered_at: data.trip.actual_delivery_time,
              }),
            }
          );

          if (response.ok) {
            console.log("Delivery confirmation sent to client");
          } else {
            console.warn(
              "Delivery confirmation failed:",
              await response.text()
            );
          }
        } catch (emailError) {
          console.warn("Could not send delivery confirmation:", emailError);
          // Don't block on email failure
        }
      }

      tripsActions.updateTrip(tripId, data.trip);

      // Log audit trail
      await this.logActivity(
        "trip_completed",
        tripId,
        "Trip completed and safe unlocked"
      );

      return { success: true, trip: data.trip };
    } catch (err: any) {
      console.error("Exception completing trip:", err);
      return {
        success: false,
        error: "Failed to complete trip. Please try again.",
      };
    }
  }

  async updateTripStatus(tripId: string, status: string) {
    try {
      const sessionToken = mobileAuthService.getSessionToken();
      if (!sessionToken) {
        return { success: false, error: "Session expired" };
      }

      const { data, error } = await supabase.functions.invoke(
        "mobile-trip-action",
        {
          headers: {
            "x-session-token": sessionToken,
          },
          body: {
            action: "update_status",
            trip_id: tripId,
            status: status,
          },
        }
      );

      if (error || !data.success) {
        return { success: false, error: data?.error || error?.message };
      }

      tripsActions.updateTrip(tripId, data.trip);
      return { success: true, trip: data.trip };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async addDeliveryNotes(tripId: string, notes: string) {
    try {
      const sessionToken = mobileAuthService.getSessionToken();
      if (!sessionToken) {
        return { success: false, error: "Session expired" };
      }

      const { error } = await supabase
        .from("trips")
        .update({
          delivery_notes: notes.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private async logActivity(event: string, tripId: string, details: string) {
    try {
      const user = currentUser.value;
      await supabase.from("activity_log").insert({
        event,
        user_type: "mobile",
        user_id: user?.username || "unknown",
        safe_id: user?.safe_id,
        trip_id: tripId,
        details,
        success: true,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  }

  setupRealtimeSubscriptions() {
    const user = currentUser.value;
    if (!user?.safe_id) return;

    console.log("Setting up trip subscriptions for safe:", user.safe_id);

    this.subscription = supabase
      .channel("trips-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trips",
          filter: `safe_id=eq.${user.safe_id}`,
        },
        (payload) => {
          console.log("Trip update received:", payload);

          if (payload.eventType === "INSERT") {
            tripsActions.addTrip(payload.new as TripData);
            this.showTripNotification(payload.new as TripData);
          } else if (payload.eventType === "UPDATE") {
            tripsActions.updateTrip(
              payload.new.id,
              payload.new as Partial<TripData>
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);

        if (status === "CHANNEL_ERROR") {
          console.error("Realtime subscription error");
        }
      });
  }

  private showTripNotification(trip: TripData) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("New Trip Assigned!", {
        body: `Delivery for ${trip.client_name} - ${trip.pickup_address}`,
        icon: "/vite.svg",
      });
    }

    console.log("NEW TRIP ASSIGNED:", trip);
  }

  async requestNotificationPermission() {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);
      return permission === "granted";
    }
    return false;
  }

  cleanup() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
    }
  }
}

export const tripsService = new TripsService();
