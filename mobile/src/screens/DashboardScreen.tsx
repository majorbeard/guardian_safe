import { useState, useEffect } from "preact/hooks";
import {
  LogOut,
  Shield,
  Bell,
  Package,
  AlertTriangle,
  Phone,
} from "lucide-preact";
import { mobileAuthService } from "../services/auth";
import { tripsService } from "../services/trips";
import { currentUser, currentSafe } from "../store/auth";
import {
  currentTrips,
  activeTrip,
  pendingTrips,
  inTransitTrip,
  isLoading,
  error,
} from "../store/trips";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { TripCard } from "../components/TripCard";
import { DeliveryScreen } from "./DeliveryScreen";

export function DashboardScreen() {
  const user = currentUser.value;
  const safe = currentSafe.value;
  const trips = currentTrips.value;
  const active = activeTrip.value;
  const pending = pendingTrips.value;
  const inTransit = inTransitTrip.value;
  const loading = isLoading.value;
  const tripsError = error.value;

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showSOS, setShowSOS] = useState(false);

  useEffect(() => {
    // Initialize trips service
    tripsService.loadTrips();
    tripsService.setupRealtimeSubscriptions();

    // Request notification permission
    tripsService.requestNotificationPermission().then(setNotificationsEnabled);

    // Cleanup on unmount
    return () => tripsService.cleanup();
  }, []);

  const handleStartTrip = async (tripId: string) => {
    const result = await tripsService.startTrip(tripId);
    if (result.success) {
      console.log("Trip started successfully!");
      // Auto-open delivery screen for in-transit trips
      const trip = trips.find((t) => t.id === tripId);
      if (trip) {
        setSelectedTrip(trip);
      }
    } else {
      console.error("Failed to start trip:", result.error);
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await mobileAuthService.logout();
    }
  };

  const handleSOS = () => {
    setShowSOS(true);
    // In production, this would trigger emergency protocols
    alert(
      "🚨 SOS ACTIVATED!\n\nEmergency services have been notified.\nStay safe and follow emergency procedures."
    );
  };

  // Show delivery screen if trip is selected
  if (selectedTrip) {
    return (
      <DeliveryScreen
        trip={selectedTrip}
        onBack={() => setSelectedTrip(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Safe {safe?.serial_number}
                </h1>
                <p className="text-sm text-gray-500">
                  {user?.driver_name || user?.username} • {trips.length} Active
                  Trip(s)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* SOS Button */}
              <button
                onClick={handleSOS}
                className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
                title="Emergency SOS"
              >
                <Phone className="h-5 w-5" />
              </button>

              {/* Notification Status */}
              <div
                className={`p-2 rounded-lg ${
                  notificationsEnabled ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                <Bell
                  className={`h-5 w-5 ${
                    notificationsEnabled ? "text-green-600" : "text-gray-600"
                  }`}
                />
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <LogOut className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safe Status */}
      <div
        className={`px-4 py-3 border-b ${
          safe?.status === "active" ? "bg-green-50" : "bg-yellow-50"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="font-medium text-gray-900">Status: </span>
              <span
                className={`font-semibold ${
                  safe?.status === "active"
                    ? "text-green-700"
                    : "text-yellow-700"
                }`}
              >
                {safe?.status?.toUpperCase()}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-900">Battery: </span>
              <span
                className={`font-semibold ${
                  (safe?.battery_level || 0) > 50
                    ? "text-green-700"
                    : (safe?.battery_level || 0) > 20
                    ? "text-yellow-700"
                    : "text-red-700"
                }`}
              >
                {safe?.battery_level}%
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-900">Lock: </span>
              <span
                className={`font-semibold ${
                  safe?.is_locked ? "text-green-700" : "text-red-700"
                }`}
              >
                {safe?.is_locked ? "SECURED" : "OPEN"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size="large" />
              <p className="mt-4 text-gray-600">Loading trips...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Error Display */}
            {tripsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{tripsError}</span>
                </div>
              </div>
            )}

            {/* In Transit Trip */}
            {inTransit && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Package className="h-5 w-5 text-yellow-600 mr-2" />
                  Current Delivery
                </h2>
                <TripCard
                  trip={inTransit}
                  onViewDetails={() => setSelectedTrip(inTransit)}
                />
              </div>
            )}

            {/* Pending Trips */}
            {pending.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Package className="h-5 w-5 text-blue-600 mr-2" />
                  Assigned Trips ({pending.length})
                </h2>
                <div className="space-y-4">
                  {pending.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onStartTrip={() => handleStartTrip(trip.id)}
                      onViewDetails={() => setSelectedTrip(trip)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No Trips */}
            {trips.length === 0 && !loading && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Active Trips
                </h3>
                <p className="text-gray-500 mb-4">
                  Waiting for trip assignment from dispatch.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    📱 You'll receive a notification when a new trip is assigned
                    to your safe.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <Shield className="h-4 w-4 text-blue-600 mr-2" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => tripsService.loadTrips()}
                  className="bg-blue-50 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  Refresh Trips
                </button>
                <button
                  onClick={handleSOS}
                  className="bg-red-50 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  Emergency SOS
                </button>
              </div>
            </div>

            {/* Status & Tips */}
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 text-gray-600 mr-2" />
                Driver Guidelines
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • Ensure safe battery is above 20% before starting trips
                </li>
                <li>• Keep phone charged and connected for GPS tracking</li>
                <li>
                  • Always verify recipient identity before unlocking safe
                </li>
                <li>• Use SOS button for any emergency situations</li>
                <li>• Contact dispatch: +27 (00) 000 0000</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
