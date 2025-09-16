import { supabase } from "./supabase";
import { currentUser } from "../store/auth";
import { tripsActions } from "../store/trips";

interface TripData {
  id: string;
  safe_id: string;
  client_name: string;
  client_email?: string;
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

  // Load trips for current user's safe
  async loadTrips() {
    const user = currentUser.value;
    if (!user?.safe_id) return;

    tripsActions.setLoading(true);

    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("safe_id", user.safe_id)
        .in("status", ["pending", "in_transit"])
        .order("scheduled_pickup", { ascending: true });

      if (error) {
        console.error("Failed to load trips:", error);
        tripsActions.setError("Failed to load trips");
        return;
      }

      tripsActions.setTrips(data || []);
    } catch (err) {
      console.error("Exception loading trips:", err);
      tripsActions.setError("Failed to load trips");
    } finally {
      tripsActions.setLoading(false);
    }
  }

  // Start trip (change status to in_transit)
  async startTrip(tripId: string) {
    try {
      const { data, error } = await supabase
        .from("trips")
        .update({
          status: "in_transit",
          actual_pickup_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local state
      tripsActions.updateTrip(tripId, data);
      return { success: true, trip: data };
    } catch (err) {
      console.error("Error starting trip:", err);
      return { success: false, error: "Failed to start trip" };
    }
  }

  // Complete trip (change status to delivered)
  async completeTrip(tripId: string) {
    try {
      const { data, error } = await supabase
        .from("trips")
        .update({
          status: "delivered",
          actual_delivery_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Update local state
      tripsActions.updateTrip(tripId, data);
      return { success: true, trip: data };
    } catch (err) {
      console.error("Error completing trip:", err);
      return { success: false, error: "Failed to complete trip" };
    }
  }

  // Setup real-time subscriptions for trip updates
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
            // Show notification for new trip
            this.showTripNotification(payload.new as TripData);
          } else if (payload.eventType === "UPDATE") {
            tripsActions.updateTrip(
              payload.new.id,
              payload.new as Partial<TripData>
            );
          }
        }
      )
      .subscribe();
  }

  // Show notification when new trip is assigned
  private showTripNotification(trip: TripData) {
    // Simple browser notification for now
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("New Trip Assigned!", {
        body: `Delivery for ${trip.client_name} - ${trip.pickup_address}`,
        icon: "/favicon.ico",
      });
    }

    // You can also trigger a modal or sound here
    console.log("🚨 NEW TRIP ASSIGNED:", trip);
  }

  // Request notification permission
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
