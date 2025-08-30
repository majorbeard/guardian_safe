import { signal, computed } from "@preact/signals";
import type { Safe, Trip, Alert, SafeUpdate, SystemStats } from "../types";

// Core data signals
export const safes = signal<Safe[]>([]);
export const trips = signal<Trip[]>([]);
export const alerts = signal<Alert[]>([]);
export const systemStats = signal<SystemStats>({
  totalSafes: 0,
  activeSafes: 0,
  offlineSafes: 0,
  activeTrips: 0,
  completedTripsToday: 0,
  averageBatteryLevel: 0,
  criticalAlerts: 0,
});

// WebSocket connection state
export const wsConnected = signal<boolean>(false);
export const wsReconnecting = signal<boolean>(false);

// Computed values
export const activeSafes = computed(() =>
  safes.value.filter((safe) => safe.status === "active")
);

export const criticalAlerts = computed(() =>
  alerts.value.filter(
    (alert) => !alert.acknowledged && alert.severity === "critical"
  )
);

export const activeTrips = computed(() =>
  trips.value.filter((trip) => ["assigned", "in_transit"].includes(trip.status))
);

export const lowBatterySafes = computed(() =>
  safes.value.filter((safe) => safe.batteryLevel < 20)
);

// Actions
export const realtimeActions = {
  // Safe management
  updateSafe: (update: SafeUpdate) => {
    safes.value = safes.value.map((safe) =>
      safe.id === update.safeId ? { ...safe, ...update } : safe
    );
  },

  setSafes: (newSafes: Safe[]) => {
    safes.value = newSafes;
  },

  addSafe: (safe: Safe) => {
    safes.value = [...safes.value, safe];
  },

  // Trip management
  setTrips: (newTrips: Trip[]) => {
    trips.value = newTrips;
  },

  updateTrip: (tripId: string, updates: Partial<Trip>) => {
    trips.value = trips.value.map((trip) =>
      trip.id === tripId ? { ...trip, ...updates } : trip
    );
  },

  addTrip: (trip: Trip) => {
    trips.value = [...trips.value, trip];
  },

  // Alert management
  addAlert: (alert: Alert) => {
    alerts.value = [alert, ...alerts.value];
  },

  acknowledgeAlert: (alertId: string) => {
    alerts.value = alerts.value.map((alert) =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
  },

  clearAlerts: () => {
    alerts.value = alerts.value.filter((alert) => !alert.acknowledged);
  },

  // System stats
  updateStats: (stats: SystemStats) => {
    systemStats.value = stats;
  },

  // WebSocket connection
  setWsConnected: (connected: boolean) => {
    wsConnected.value = connected;
    if (connected) {
      wsReconnecting.value = false;
    }
  },

  setWsReconnecting: (reconnecting: boolean) => {
    wsReconnecting.value = reconnecting;
  },
};
