import { useState } from "preact/hooks";
import {
  Shield,
  Battery,
  Lock,
  Unlock,
  MapPin,
  Activity,
  // MoreHorizontal,
} from "lucide-preact";
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
  if (!isOwnerRole && user) {
    safesList = safesList.filter((safe) => safe.assigned_to === user.id);
  }
  if (limit) safesList = safesList.slice(0, limit);

  const handleStatusChange = async (safeId: string, newStatus: string) => {
    if (!isOwnerRole) return;
    setUpdatingStatus(safeId);
    try {
      await dataService.updateSafeStatus(safeId, { status: newStatus as any });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return "text-green-600";
    if (level > 20) return "text-yellow-600";
    return "text-red-600";
  };

  if (safesList.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <Shield className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-900">No safes found</h3>
        <p className="text-sm text-gray-500 mt-1">
          Register a new safe to start tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-gray-200 rounded-lg">
      <ul className="divide-y divide-gray-100 bg-white">
        {safesList.map((safe) => (
          <li
            key={safe.id}
            className="hover:bg-gray-50 transition-colors duration-150 p-4 sm:px-6"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left: Identity */}
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`p-2 rounded-md ${
                    safe.status === "active"
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {safe.serial_number}
                    </h4>
                    <span
                      className={`badge ${
                        safe.status === "active"
                          ? "badge-success"
                          : safe.status === "offline"
                          ? "badge-error"
                          : "badge-neutral"
                      }`}
                    >
                      {safe.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="font-mono text-gray-400">
                      ID: {safe.id.slice(-8)}
                    </span>
                    {safe.tracking_device_id && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Tracked
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle: Telemetry (Hidden on small mobile) */}
              <div className="hidden sm:flex items-center gap-6 text-sm">
                <div
                  className="flex items-center gap-1.5"
                  title="Battery Level"
                >
                  <Battery
                    className={`h-4 w-4 ${getBatteryColor(safe.battery_level)}`}
                  />
                  <span className="font-medium text-gray-700">
                    {safe.battery_level}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5" title="Lock Status">
                  {safe.is_locked ? (
                    <Lock className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Unlock className="h-4 w-4 text-brand" />
                  )}
                  <span className="text-gray-600">
                    {safe.is_locked ? "Locked" : "Open"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Activity className="h-3 w-3" />
                  <span className="text-xs">
                    {safe.last_update
                      ? formatDistanceToNow(new Date(safe.last_update))
                      : "Never"}
                  </span>
                </div>
              </div>

              {/* Right: Actions */}
              {showActions && isOwnerRole && (
                <div className="flex items-center">
                  {updatingStatus === safe.id ? (
                    <LoadingSpinner size="small" />
                  ) : (
                    <div className="flex gap-2">
                      {safe.status === "inactive" && (
                        <button
                          onClick={() => handleStatusChange(safe.id, "active")}
                          className="btn btn-secondary text-xs h-8 py-0"
                        >
                          Activate
                        </button>
                      )}
                      {safe.status === "active" && (
                        <button
                          onClick={() =>
                            handleStatusChange(safe.id, "maintenance")
                          }
                          className="btn btn-ghost text-xs"
                        >
                          Maintenance
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
