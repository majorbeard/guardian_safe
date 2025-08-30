import { useState, useEffect } from "preact/hooks";
import {
  Plus,
  Shield,
  Battery,
  MapPin,
  Settings,
  AlertTriangle,
} from "lucide-preact";
import { safes } from "../store/realtime";
import { realtimeActions } from "../store/realtime";
import { apiService } from "../services/api";
import Button from "../components/Button";
import Input from "../components/Input";
import StatusBadge from "../components/StatusBadge";
import type { Safe } from "../types";
import { formatDistanceToNow } from "date-fns";

export default function SafesPage() {
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedSafe, setSelectedSafe] = useState<Safe | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const safesList = safes.value;

  useEffect(() => {
    const loadSafes = async () => {
      setLoading(true);
      const response = await apiService.getSafes();

      if (response.success && response.data) {
        realtimeActions.setSafes(response.data);
      }

      setLoading(false);
    };

    loadSafes();
  }, []);

  const filteredSafes = safesList.filter(
    (safe) =>
      safe.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      safe.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const RegisterSafeModal = () => {
    const [serialNumber, setSerialNumber] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      setSubmitting(true);
      setError("");

      try {
        const response = await apiService.registerSafe(serialNumber);

        if (response.success && response.data) {
          realtimeActions.addSafe(response.data);
          setShowRegisterModal(false);
          setSerialNumber("");
        } else {
          setError(response.error || "Failed to register safe");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Register New Safe</h2>
            <Button variant="ghost" onClick={() => setShowRegisterModal(false)}>
              ×
            </Button>
          </div>

          <form onSubmit={(e) => handleSubmit(e)} class="space-y-4">
            {error && (
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <Input
              label="Serial Number"
              value={serialNumber}
              onInput={setSerialNumber}
              placeholder="Enter safe serial number"
              required
            />

            <div class="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => setShowRegisterModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || !serialNumber.trim()}
              >
                Register Safe
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const SafeDetailsModal = ({ safe }: { safe: Safe }) => {
    const [updating, setUpdating] = useState(false);

    const handleLockToggle = async () => {
      setUpdating(true);
      try {
        if (safe.isLocked) {
          // In real implementation, you'd need OTP for unlocking
          console.log("Unlock safe requires OTP");
        } else {
          await apiService.lockSafe(safe.id);
        }
      } catch (error) {
        console.error("Failed to toggle lock:", error);
      } finally {
        setUpdating(false);
      }
    };

    return (
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Safe Details</h2>
            <Button variant="ghost" onClick={() => setSelectedSafe(null)}>
              ×
            </Button>
          </div>

          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">Safe ID</label>
                <p class="text-sm font-mono text-gray-900">{safe.id}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Serial Number
                </label>
                <p class="text-lg font-mono text-gray-900">
                  {safe.serialNumber}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">Status</label>
                <div class="mt-1">
                  <StatusBadge status={safe.status} type="safe" />
                </div>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Lock Status
                </label>
                <p class="text-sm text-gray-900 mt-1">
                  {safe.isLocked ? "🔒 Locked" : "🔓 Unlocked"}
                </p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Battery Level
                </label>
                <div class="flex items-center space-x-2 mt-1">
                  <Battery
                    class={`h-4 w-4 ${
                      safe.batteryLevel > 50
                        ? "text-green-500"
                        : safe.batteryLevel > 20
                        ? "text-yellow-500"
                        : "text-red-500"
                    }`}
                  />
                  <span class="text-sm font-medium">{safe.batteryLevel}%</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Current Location
                </label>
                <p class="text-sm text-gray-900 mt-1">
                  {safe.location.lat.toFixed(6)}, {safe.location.lng.toFixed(6)}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  Updated:{" "}
                  {formatDistanceToNow(new Date(safe.location.lastUpdate))} ago
                </p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Tamper Status
                </label>
                <div class="mt-1">
                  {safe.isTampered ? (
                    <span class="flex items-center text-red-600">
                      <AlertTriangle class="h-4 w-4 mr-1" />
                      Tampered
                    </span>
                  ) : (
                    <span class="text-green-600">✅ Secure</span>
                  )}
                </div>
              </div>
            </div>

            {safe.assignedTrip && (
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Assigned Trip
                </label>
                <p class="text-sm text-gray-900 mt-1">{safe.assignedTrip}</p>
              </div>
            )}

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Firmware Version
                </label>
                <p class="text-sm text-gray-900 mt-1">{safe.firmwareVersion}</p>
              </div>
              {safe.lastMaintenance && (
                <div>
                  <label class="text-sm font-medium text-gray-500">
                    Last Maintenance
                  </label>
                  <p class="text-sm text-gray-900 mt-1">
                    {new Date(safe.lastMaintenance).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div class="pt-4 border-t border-gray-200">
              <label class="text-sm font-medium text-gray-500 mb-3 block">
                Actions
              </label>
              <div class="grid grid-cols-2 gap-3">
                <Button
                  variant={safe.isLocked ? "danger" : "primary"}
                  onClick={handleLockToggle}
                  loading={updating}
                  disabled={updating || safe.status !== "active"}
                  className="w-full"
                >
                  {safe.isLocked ? "Unlock Safe" : "Lock Safe"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    /* TODO: Update maintenance */
                  }}
                  className="w-full"
                >
                  <Settings class="h-4 w-4 mr-2" />
                  Maintenance
                </Button>
              </div>
            </div>

            {(safe.batteryLevel < 20 ||
              safe.isTampered ||
              safe.status === "error") && (
              <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 class="text-sm font-medium text-red-800 mb-2">
                  Attention Required
                </h3>
                <ul class="text-sm text-red-700 space-y-1">
                  {safe.batteryLevel < 20 && (
                    <li>
                      • Battery level is critically low ({safe.batteryLevel}%)
                    </li>
                  )}
                  {safe.isTampered && (
                    <li>• Tampering detected - inspect immediately</li>
                  )}
                  {safe.status === "error" && (
                    <li>• System error detected - requires maintenance</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div class="p-6">
        <div class="animate-pulse space-y-4">
          <div class="h-8 bg-gray-200 rounded w-1/4" />
          <div class="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const activeSafes = safesList.filter((safe) => safe.status === "active");
  const offlineSafes = safesList.filter((safe) => safe.status === "offline");
  const lowBatterySafes = safesList.filter((safe) => safe.batteryLevel < 20);

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Safe Management</h1>
          <p class="text-gray-600">Monitor and manage all Guardian safes</p>
        </div>
        <Button onClick={() => setShowRegisterModal(true)}>
          <Plus class="h-4 w-4 mr-2" />
          Register Safe
        </Button>
      </div>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Shield class="h-8 w-8 text-green-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Active Safes</p>
              <p class="text-2xl font-bold text-gray-900">
                {activeSafes.length}
              </p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Shield class="h-8 w-8 text-red-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Offline Safes</p>
              <p class="text-2xl font-bold text-gray-900">
                {offlineSafes.length}
              </p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Battery class="h-8 w-8 text-yellow-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Low Battery</p>
              <p class="text-2xl font-bold text-gray-900">
                {lowBatterySafes.length}
              </p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Battery class="h-8 w-8 text-blue-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Avg Battery</p>
              <p class="text-2xl font-bold text-gray-900">
                {safesList.length > 0
                  ? Math.round(
                      safesList.reduce(
                        (sum, safe) => sum + safe.batteryLevel,
                        0
                      ) / safesList.length
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div class="bg-white rounded-lg shadow p-4">
        <Input
          placeholder="Search safes by serial number or ID..."
          value={searchTerm}
          onInput={setSearchTerm}
        />
      </div>

      {/* Safes List */}
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">
            {filteredSafes.length} Safe{filteredSafes.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {filteredSafes.length === 0 ? (
          <div class="p-8 text-center">
            <Shield class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">No safes found</p>
          </div>
        ) : (
          <div class="divide-y divide-gray-200">
            {filteredSafes.map((safe) => (
              <div
                key={safe.id}
                class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedSafe(safe)}
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <div
                      class={`p-2 rounded-lg ${
                        safe.status === "active"
                          ? "bg-green-100"
                          : safe.status === "error"
                          ? "bg-red-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <Shield
                        class={`h-6 w-6 ${
                          safe.status === "active"
                            ? "text-green-600"
                            : safe.status === "error"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 class="font-medium text-gray-900">
                        Safe {safe.serialNumber}
                      </h3>
                      <p class="text-sm text-gray-500">
                        ID: {safe.id.slice(-8)}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center space-x-6">
                    <div class="text-center">
                      <StatusBadge status={safe.status} type="safe" />
                    </div>
                    <div class="text-center">
                      <div class="flex items-center space-x-1">
                        <Battery
                          class={`h-4 w-4 ${
                            safe.batteryLevel > 50
                              ? "text-green-500"
                              : safe.batteryLevel > 20
                              ? "text-yellow-500"
                              : "text-red-500"
                          }`}
                        />
                        <span class="text-sm font-medium">
                          {safe.batteryLevel}%
                        </span>
                      </div>
                    </div>
                    <div class="text-center">
                      <p class="text-sm text-gray-900">
                        {safe.isLocked ? "🔒 Locked" : "🔓 Unlocked"}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm text-gray-500">
                        {formatDistanceToNow(
                          new Date(safe.location.lastUpdate)
                        )}{" "}
                        ago
                      </p>
                      {safe.assignedTrip && (
                        <p class="text-xs text-blue-600">Trip assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warning indicators */}
                <div class="mt-2 flex space-x-2">
                  {safe.batteryLevel < 20 && (
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                      <AlertTriangle class="h-3 w-3 mr-1" />
                      Low Battery
                    </span>
                  )}
                  {safe.isTampered && (
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                      <AlertTriangle class="h-3 w-3 mr-1" />
                      Tampered
                    </span>
                  )}
                  {safe.status === "offline" && (
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                      Offline
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showRegisterModal && <RegisterSafeModal />}
      {selectedSafe && <SafeDetailsModal safe={selectedSafe} />}
    </div>
  );
}
