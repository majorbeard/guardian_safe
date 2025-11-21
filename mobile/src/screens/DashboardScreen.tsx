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
  // activeTrip,
  pendingTrips,
  inTransitTrip,
  isLoading,
  error,
} from "../store/trips";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { TripCard } from "../components/TripCard";
import { DeliveryScreen } from "./DeliveryScreen";
import { RefreshCw, Unlock } from "lucide-preact";
import { bluetoothService } from "../services/bluetooth";

export function DashboardScreen() {
  const user = currentUser.value;
  const safe = currentSafe.value;
  const trips = currentTrips.value;
  // const active = activeTrip.value;
  const pending = pendingTrips.value;
  const inTransit = inTransitTrip.value;
  const loading = isLoading.value;
  const tripsError = error.value;

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [, setShowSOS] = useState(false);

  const [piStatus, setPiStatus] = useState<{
    batteryPercent: number;
    safeStatus: string;
    voltage: number;
    lockOpen: boolean;
  } | null>(null);

  const [btConnected, setBtConnected] = useState(false);

  // Effect to initialize Bluetooth and poll status:
  useEffect(() => {
    const initBluetooth = async () => {
      await bluetoothService.initialize();

      // Try to auto-connect if already paired
      const scanResult = await bluetoothService.scanForPi();
      if (scanResult.success) {
        const connectResult = await bluetoothService.connectToPi();
        if (connectResult.success) {
          setBtConnected(true);

          // Get initial status
          const statusResult = await bluetoothService.readPiStatus();
          if (statusResult.success && statusResult.status) {
            setPiStatus({
              batteryPercent: statusResult.status.batteryPercent,
              safeStatus: statusResult.status.safeStatus,
              voltage: statusResult.status.voltage,
              lockOpen: statusResult.status.lockOpen,
            });
          }
        }
      }
    };

    initBluetooth();

    return () => bluetoothService.disconnect();
  }, []);

  // Reffect to poll status every 30 seconds when connected:
  useEffect(() => {
    if (!btConnected) return;

    const pollStatus = async () => {
      const result = await bluetoothService.readPiStatus();
      if (result.success && result.status) {
        setPiStatus({
          batteryPercent: result.status.batteryPercent,
          safeStatus: result.status.safeStatus,
          voltage: result.status.voltage,
          lockOpen: result.status.lockOpen,
        });
      }
    };

    const interval = setInterval(pollStatus, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [btConnected]);

  // Effect to poll Pi status every 30 seconds
  useEffect(() => {
    const pollPiStatus = async () => {
      const result = await bluetoothService.readPiStatus();
      if (result.success && result.status) {
        setPiStatus({
          batteryPercent: result.status.batteryPercent,
          safeStatus: result.status.safeStatus,
          voltage: result.status.voltage,
          lockOpen: result.status.lockOpen,
        });

        // TODO:
        // Update safe in store
        // Dispatch to update the safe state
      }
    };

    // Poll immediately and then every 30 seconds
    pollPiStatus();
    const interval = setInterval(pollPiStatus, 30000);

    return () => clearInterval(interval);
  }, [btConnected]);

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
      "SOS ACTIVATED!\n\nEmergency services have been notified.\nStay safe and follow emergency procedures."
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
      <div className="px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-wrap gap-y-2">
            {/* Bluetooth Connection Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  btConnected ? "bg-blue-500 animate-pulse" : "bg-gray-400"
                }`}
              ></div>
              <span className="text-xs text-gray-600">
                {btConnected ? "Connected" : "Disconnected"}
              </span>
            </div>

            {/* Safe Status */}
            <div className="text-sm">
              <span className="font-medium text-gray-900">Status: </span>
              <span
                className={`font-semibold ${
                  (piStatus?.safeStatus || safe?.status) === "active"
                    ? "text-green-700"
                    : (piStatus?.safeStatus || safe?.status) === "maintenance"
                    ? "text-yellow-700"
                    : (piStatus?.safeStatus || safe?.status) === "inactive"
                    ? "text-gray-700"
                    : "text-red-700"
                }`}
              >
                {(piStatus?.safeStatus || safe?.status)?.toUpperCase()}
              </span>
            </div>

            {/* Battery Level */}
            <div className="text-sm">
              <span className="font-medium text-gray-900">Battery: </span>
              <span
                className={`font-semibold ${
                  (piStatus?.batteryPercent ?? safe?.battery_level ?? 0) > 50
                    ? "text-green-700"
                    : (piStatus?.batteryPercent ?? safe?.battery_level ?? 0) >
                      20
                    ? "text-yellow-700"
                    : "text-red-700"
                }`}
              >
                {piStatus?.batteryPercent ?? safe?.battery_level ?? 0}%
              </span>
              {piStatus?.voltage && (
                <span className="text-gray-500 text-xs ml-1">
                  ({piStatus.voltage.toFixed(2)}V)
                </span>
              )}
            </div>

            {/* Lock Status */}
            <div className="text-sm">
              <span className="font-medium text-gray-900">Lock: </span>
              <span
                className={`font-semibold ${
                  piStatus?.lockOpen ?? safe?.is_locked === false
                    ? "text-red-700"
                    : "text-green-700"
                }`}
              >
                {piStatus?.lockOpen ?? safe?.is_locked === false
                  ? "OPEN"
                  : "SECURED"}
              </span>
            </div>
          </div>

          {/* Refresh Button */}
          {btConnected && (
            <button
              onClick={async () => {
                const result = await bluetoothService.readPiStatus();
                if (result.success && result.status) {
                  setPiStatus({
                    batteryPercent: result.status.batteryPercent,
                    safeStatus: result.status.safeStatus,
                    voltage: result.status.voltage,
                    lockOpen: result.status.lockOpen,
                  });
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>

        {/* Low Battery Warning */}
        {(piStatus?.batteryPercent ?? safe?.battery_level ?? 100) < 20 && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700 font-medium">
              ⚠️ Low Battery Warning -{" "}
              {piStatus?.batteryPercent ?? safe?.battery_level}% remaining
              {piStatus?.voltage && ` (${piStatus.voltage.toFixed(2)}V)`}
            </span>
          </div>
        )}

        {/* Lock Open Warning */}
        {piStatus?.lockOpen && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 flex items-center space-x-2">
            <Unlock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-700 font-medium">
              ⚠️ Safe is currently UNLOCKED
            </span>
          </div>
        )}

        {/* Not Connected to Pi Warning */}
        {!btConnected && (
          <div className="mt-2 bg-gray-50 border border-gray-200 rounded px-3 py-2 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">
              Not connected to safe. Real-time status unavailable.
            </span>
          </div>
        )}
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
                    You'll receive a notification when a new trip is assigned to
                    your safe.
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
                <li>• Contact dispatch: +27 (61) 140 2806</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
