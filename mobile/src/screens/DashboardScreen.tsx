import { useState, useEffect } from "preact/hooks";
import {
  LogOut,
  Shield,
  // Bell,
  Package,
  AlertTriangle,
  Phone,
  RefreshCw,
  Unlock,
  Bluetooth,
} from "lucide-preact";
import { mobileAuthService } from "../services/auth";
import { tripsService } from "../services/trips";
import { currentUser, currentSafe } from "../store/auth";
import {
  currentTrips,
  pendingTrips,
  inTransitTrip,
  isLoading,
  error,
} from "../store/trips";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { TripCard } from "../components/TripCard";
import { DeliveryScreen } from "./DeliveryScreen";
import { bluetoothService } from "../services/bluetooth";

export function DashboardScreen() {
  const user = currentUser.value;
  const safe = currentSafe.value;
  const trips = currentTrips.value;
  const pending = pendingTrips.value;
  const inTransit = inTransitTrip.value;
  const loading = isLoading.value;
  const tripsError = error.value;

  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [btConnected, setBtConnected] = useState(false);

  // Pi Status State
  const [piStatus, setPiStatus] = useState<{
    verified: boolean;
    lockOpen: boolean;
    batteryPercent: number;
    safeStatus: string;
    voltage: number;
  } | null>(null);

  // 1. Initialize Bluetooth
  useEffect(() => {
    const initBluetooth = async () => {
      await bluetoothService.initialize();
      // Try auto-connect
      const scanResult = await bluetoothService.scanForPi();
      if (scanResult.success) {
        const connectResult = await bluetoothService.connectToPi();
        if (connectResult.success) {
          setBtConnected(true);
          // Initial status read
          const statusResult = await bluetoothService.readPiStatus();
          if (statusResult.success && statusResult.status) {
            updateStatusState(statusResult.status);
          }
        }
      }
    };
    initBluetooth();
    return () => bluetoothService.disconnect();
  }, []);

  // 2. Poll Status
  useEffect(() => {
    if (!btConnected) return;
    const pollStatus = async () => {
      const result = await bluetoothService.readPiStatus();
      if (result.success && result.status) {
        updateStatusState(result.status);
      }
    };
    const interval = setInterval(pollStatus, 30000);
    return () => clearInterval(interval);
  }, [btConnected]);

  // Helper to update status safely
  const updateStatusState = (status: any) => {
    setPiStatus({
      verified: status.verified,
      lockOpen: status.lockOpen,
      batteryPercent: status.batteryPercent,
      safeStatus: status.safeStatus,
      voltage: status.voltage,
    });
  };

  // Subscribe to real-time status updates
  useEffect(() => {
    if (!btConnected) return;

    bluetoothService.subscribeToPiStatus((status) => {
      console.log("Real-time status update:", status);
      // Merge notification with existing state to preserve all fields
      setPiStatus((prev) => ({
        verified: status.verified,
        lockOpen: status.lockOpen,
        batteryPercent: status.batteryPercent,
        voltage: status.voltage,
        safeStatus: prev?.safeStatus || "active", // Preserve or default
      }));
    });
  }, [btConnected]);

  // 3. Load Trips
  useEffect(() => {
    tripsService.loadTrips();
    tripsService.setupRealtimeSubscriptions();
    return () => tripsService.cleanup();
  }, []);

  const handleStartTrip = async (tripId: string) => {
    const result = await tripsService.startTrip(tripId);
    if (result.success) {
      const trip = trips.find((t) => t.id === tripId);
      if (trip) setSelectedTrip(trip);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleLogout = async () => {
    if (confirm("Sign out of driver session?")) {
      await mobileAuthService.logout();
    }
  };

  const handleSOS = () => {
    alert("SOS ACTIVATED: Emergency services notified.");
  };

  // If a trip is selected or in progress, show Delivery Screen
  if (selectedTrip) {
    return (
      <DeliveryScreen
        trip={selectedTrip}
        onBack={() => setSelectedTrip(null)}
      />
    );
  }

  // Main Dashboard UI
  return (
    <div className="min-h-screen bg-gray-50 pb-safe">
      {/* Header */}
      <div className="bg-white pt-safe px-4 py-4 pt-6 border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Hi, {user?.driver_name || user?.username}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Safe ID:{" "}
              <span className="font-mono font-medium">
                {safe?.serial_number}
              </span>
            </p>
          </div>
          <button
            onClick={handleSOS}
            className="bg-red-50 text-red-600 p-2.5 rounded-full border border-red-100 active:scale-95 transition-transform shadow-sm"
          >
            <Phone className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Safe Status Scroll */}
      <div className="bg-gray-50 pt-4 pb-2 px-4">
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {/* Status Card: Connection */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm min-w-[130px] flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Bluetooth className="h-3.5 w-3.5" /> Connection
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  btConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
                }`}
              ></div>
              <span className="text-sm font-medium text-gray-900">
                {btConnected ? "Connected" : "Offline"}
              </span>
            </div>
          </div>

          {/* Status Card: Battery */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm min-w-[130px] flex flex-col justify-between">
            <p className="text-xs text-gray-500 mb-2">Battery Level</p>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-xl font-bold ${
                  (piStatus?.batteryPercent ?? safe?.battery_level ?? 0) < 20
                    ? "text-red-600"
                    : "text-gray-900"
                }`}
              >
                {piStatus?.batteryPercent ?? safe?.battery_level ?? 0}%
              </span>
              {piStatus?.voltage && (
                <span className="text-xs text-gray-400">
                  {piStatus.voltage.toFixed(1)}V
                </span>
              )}
            </div>
          </div>

          {/* Status Card: Lock */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm min-w-[130px] flex flex-col justify-between">
            <p className="text-xs text-gray-500 mb-2">Lock State</p>
            <div className="flex items-center gap-1.5">
              {piStatus?.lockOpen || safe?.is_locked === false ? (
                <>
                  <Unlock className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">
                    Unlocked
                  </span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    Secured
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      <div className="px-4 space-y-2">
        {!btConnected && (
          <div className="bg-gray-900 text-white px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Bluetooth className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium">Safe disconnected</span>
            </div>
          </div>
        )}
        {tripsError && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4" /> {tripsError}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-4 py-4 space-y-6 pb-24">
        {loading ? (
          <div className="py-12 text-center">
            <LoadingSpinner size="large" />
            <p className="mt-3 text-sm text-gray-500">Syncing trips...</p>
          </div>
        ) : (
          <>
            {/* In Transit Section */}
            {inTransit && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Current Job
                </h2>
                <div
                  onClick={() => setSelectedTrip(inTransit)}
                  className="cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <TripCard trip={inTransit} variant="active" />
                </div>
              </section>
            )}

            {/* Pending Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Up Next ({pending.length})
                </h2>
                <button
                  onClick={() => tripsService.loadTrips()}
                  className="text-brand text-xs font-medium p-1"
                >
                  Refresh
                </button>
              </div>

              {pending.length === 0 && !inTransit ? (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No trips assigned.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onStartTrip={() => handleStartTrip(trip.id)}
                      onViewDetails={() => setSelectedTrip(trip)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe px-6 py-3 pb-8 flex justify-between items-center z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button className="flex flex-col items-center gap-1 text-brand w-16">
          <Shield className="h-6 w-6" />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 active:text-gray-800 w-16"
          onClick={() => tripsService.loadTrips()}
        >
          <RefreshCw className="h-6 w-6" />
          <span className="text-[10px] font-medium">Sync</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-red-600 active:text-red-700 w-16"
          onClick={handleLogout}
        >
          <LogOut className="h-6 w-6" />
          <span className="text-[10px] font-medium">Exit</span>
        </button>
      </div>
    </div>
  );
}
