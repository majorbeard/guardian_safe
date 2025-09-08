import { supabase } from "../lib/supabase";
import { dataActions } from "../store/data";
import { currentUser } from "../store/auth";
import type { Safe, Trip } from "../types";

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

  async createTrip(tripData: any) {
    const user = currentUser.value;
    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data, error } = await supabase
      .from("trips")
      .insert({
        ...tripData,
        created_by: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Real-time subscription will update the store automatically
    return { success: true, trip: data };
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
}

export const dataService = new DataService();
