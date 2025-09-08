import { signal } from "@preact/signals";
import type { Safe, Trip } from "../types";

// Data signals
export const safes = signal<Safe[]>([]);
export const trips = signal<Trip[]>([]);
export const loading = signal<boolean>(false);

// Data actions
export const dataActions = {
  setSafes: (newSafes: Safe[]) => {
    safes.value = newSafes;
  },

  addSafe: (safe: Safe) => {
    safes.value = [...safes.value, safe];
  },

  updateSafe: (safeId: string, updates: Partial<Safe>) => {
    safes.value = safes.value.map((safe) =>
      safe.id === safeId ? { ...safe, ...updates } : safe
    );
  },

  setTrips: (newTrips: Trip[]) => {
    trips.value = newTrips;
  },

  addTrip: (trip: Trip) => {
    trips.value = [...trips.value, trip];
  },

  updateTrip: (tripId: string, updates: Partial<Trip>) => {
    trips.value = trips.value.map((trip) =>
      trip.id === tripId ? { ...trip, ...updates } : trip
    );
  },

  setLoading: (isLoading: boolean) => {
    loading.value = isLoading;
  },
};
