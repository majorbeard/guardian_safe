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

  async loadTrips() {
    const user = currentUser.value;
    if (!user?.safe_id) {
      console.log("No user or safe_id found:", user);
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

      tripsActions.updateTrip(tripId, data);
      return { success: true, trip: data };
    } catch (err) {
      console.error("Error starting trip:", err);
      return { success: false, error: "Failed to start trip" };
    }
  }

  async completeTrip(tripId: string) {
    console.log("Attempting to complete trip:", tripId);

    try {
      const { data, error } = await supabase
        .from("trips")
        .update({
          status: "delivered",
          actual_delivery_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tripId)
        .select("*")
        .single();

      console.log("Complete trip result:", data);
      console.log("Complete trip error:", error);

      if (error) {
        console.error("Failed to complete trip:", error);
        return { success: false, error: error.message };
      }

      console.log("Trip completed successfully!");

      // Send delivery confirmation to CLIENT
      if (data.client_email) {
        console.log(
          "Sending delivery confirmation to client:",
          data.client_email
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
                to: data.client_email,
                client_name: data.client_name,
                recipient_name: data.recipient_name || data.client_name,
                trip_id: data.id,
                delivery_address: data.delivery_address,
                delivered_at: data.actual_delivery_time,
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

      tripsActions.updateTrip(tripId, data);
      return { success: true, trip: data };
    } catch (err) {
      console.error("Exception completing trip:", err);
      return { success: false, error: "Failed to complete trip" };
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
      .subscribe();
  }

  private showTripNotification(trip: TripData) {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("New Trip Assigned!", {
        body: `Delivery for ${trip.client_name} - ${trip.pickup_address}`,
        icon: "/favicon.ico",
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
