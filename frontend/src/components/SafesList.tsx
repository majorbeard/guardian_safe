import { useState } from "preact/hooks";
import { Shield, Battery, Lock, Unlock, MapPin, Activity } from "lucide-preact";
import { safes } from "../store/data";
import { currentUser, isOwner } from "../store/auth";
import { dataService } from "../services/data";
import { LoadingSpinner } from "./LoadingSpinner";
import { formatDistanceToNow } from "date-fns";

interface SafesListProps {
  limit?: number;
  showActions?: boolean;
}

export function SafesList({ limit, showActions = true }: SafesListProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const user = currentUser.value;
  const isOwnerRole = isOwner.value;

  let safesList = safes.value;

  // Filter safes based on user role
  if (!isOwnerRole && user) {
    safesList = safesList.filter((safe) => safe.assigned_to === user.id);
  }

  // Apply limit if specified
  if (limit) {
    safesList = safesList.slice(0, limit);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "inactive":
        return "text-gray-600 bg-gray-100";
      case "maintenance":
        return "text-yellow-600 bg-yellow-100";
      case "offline":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-600";
    if (level > 20) return "text-yellow-600";
    return "text-red-600";
  };

  const handleStatusChange = async (safeId: string, newStatus: string) => {
    if (!isOwnerRole) return;

    setUpdatingStatus(safeId);
    try {
      await dataService.updateSafeStatus(safeId, { status: newStatus as any });
    } catch (error) {
      console.error("Failed to update safe status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (safesList.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Safes Found
        </h3>
        <p className="text-gray-500">
          {isOwnerRole
            ? "Register your first safe to get started"
            : "No safes have been assigned to your account yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safesList.map((safe) => (
        <div
          key={safe.id}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`p-2 rounded-lg ${
                  safe.status === "active"
                    ? "bg-green-100"
                    : safe.status === "offline"
                    ? "bg-red-100"
                    : "bg-gray-100"
                }`}
              >
                <Shield
                  className={`h-6 w-6 ${
                    safe.status === "active"
                      ? "text-green-600"
                      : safe.status === "offline"
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                />
              </div>

              <div>
                <h3 className="font-medium text-gray-900">
                  Safe {safe.serial_number}
                </h3>
                <p className="text-sm text-gray-500">ID: {safe.id.slice(-8)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              {/* Status */}
              <div className="text-center">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    safe.status
                  )}`}
                >
                  {safe.status}
                </span>
              </div>

              {/* Battery */}
              <div className="flex items-center space-x-1">
                <Battery
                  className={`h-4 w-4 ${getBatteryColor(safe.battery_level)}`}
                />
                <span
                  className={`text-sm font-medium ${getBatteryColor(
                    safe.battery_level
                  )}`}
                >
                  {safe.battery_level}%
                </span>
              </div>

              {/* Lock Status */}
              <div className="flex items-center space-x-1">
                {safe.is_locked ? (
                  <Lock className="h-4 w-4 text-gray-600" />
                ) : (
                  <Unlock className="h-4 w-4 text-orange-600" />
                )}
                <span className="text-sm text-gray-600">
                  {safe.is_locked ? "Locked" : "Unlocked"}
                </span>
              </div>

              {/* Last Update */}
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {safe.last_update ? (
                    <>
                      <Activity className="h-3 w-3 inline mr-1" />
                      {formatDistanceToNow(new Date(safe.last_update))} ago
                    </>
                  ) : (
                    "No recent activity"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              {safe.tracking_device_id && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>Tracking: {safe.tracking_device_id}</span>
                </div>
              )}
              <span>Device: {safe.device_hash.slice(0, 8)}...</span>
            </div>

            {/* Actions for Owner */}
            {showActions && isOwnerRole && (
              <div className="flex space-x-2">
                {updatingStatus === safe.id ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    {safe.status === "inactive" && (
                      <button
                        onClick={() => handleStatusChange(safe.id, "active")}
                        className="text-green-600 hover:text-green-800 text-xs"
                      >
                        Activate
                      </button>
                    )}
                    {safe.status === "active" && (
                      <button
                        onClick={() =>
                          handleStatusChange(safe.id, "maintenance")
                        }
                        className="text-yellow-600 hover:text-yellow-800 text-xs"
                      >
                        Maintenance
                      </button>
                    )}
                    {safe.status === "maintenance" && (
                      <button
                        onClick={() => handleStatusChange(safe.id, "active")}
                        className="text-green-600 hover:text-green-800 text-xs"
                      >
                        Reactivate
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Battery Warning */}
          {safe.battery_level < 20 && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
              <p className="text-sm text-red-700">
                ⚠️ Low battery warning - {safe.battery_level}% remaining
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
