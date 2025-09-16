import { signal, computed } from "@preact/signals";

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

interface TripsState {
  trips: TripData[];
  loading: boolean;
  error: string | null;
  activeTrip: TripData | null;
}

// Trips state
export const tripsState = signal<TripsState>({
  trips: [],
  loading: false,
  error: null,
  activeTrip: null,
});

// Computed values
export const currentTrips = computed(() => tripsState.value.trips);
export const activeTrip = computed(() => tripsState.value.activeTrip);
export const isLoading = computed(() => tripsState.value.loading);
export const error = computed(() => tripsState.value.error);

// Get pending trips (not started yet)
export const pendingTrips = computed(() =>
  tripsState.value.trips.filter((trip) => trip.status === "pending")
);

// Get in-transit trip (should only be one)
export const inTransitTrip = computed(() =>
  tripsState.value.trips.find((trip) => trip.status === "in_transit")
);

// Actions
export const tripsActions = {
  setTrips: (trips: TripData[]) => {
    tripsState.value = {
      ...tripsState.value,
      trips,
      error: null,
      // Set active trip to in-transit or next pending
      activeTrip:
        trips.find((t) => t.status === "in_transit") ||
        trips.find((t) => t.status === "pending") ||
        null,
    };
  },

  addTrip: (trip: TripData) => {
    const newTrips = [...tripsState.value.trips, trip];
    tripsState.value = {
      ...tripsState.value,
      trips: newTrips,
      activeTrip:
        trip.status === "pending" && !tripsState.value.activeTrip
          ? trip
          : tripsState.value.activeTrip,
    };
  },

  updateTrip: (tripId: string, updates: Partial<TripData>) => {
    const updatedTrips = tripsState.value.trips.map((trip) =>
      trip.id === tripId ? { ...trip, ...updates } : trip
    );

    tripsState.value = {
      ...tripsState.value,
      trips: updatedTrips,
      activeTrip:
        tripsState.value.activeTrip?.id === tripId
          ? { ...tripsState.value.activeTrip, ...updates }
          : tripsState.value.activeTrip,
    };
  },

  setActiveTrip: (trip: TripData | null) => {
    tripsState.value = {
      ...tripsState.value,
      activeTrip: trip,
    };
  },

  setLoading: (loading: boolean) => {
    tripsState.value = {
      ...tripsState.value,
      loading,
    };
  },

  setError: (error: string | null) => {
    tripsState.value = {
      ...tripsState.value,
      error,
      loading: false,
    };
  },

  clearError: () => {
    tripsState.value = {
      ...tripsState.value,
      error: null,
    };
  },
};
