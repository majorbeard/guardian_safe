import { useState } from "preact/hooks";
import { MapPin, Clock, Navigation, ExternalLink, X } from "lucide-preact";
import { trips, safes } from "../store/data";
import { currentUser, isOwner } from "../store/auth";
import { dataService } from "../services/data";
import { LoadingSpinner } from "./LoadingSpinner";
import { TripTrackingModal } from "./TripTrackingModal";
import { format, isPast } from "date-fns";
import { toast } from "./Toast";

interface TripsListProps {
  limit?: number;
  showActions?: boolean;
  compact?: boolean;
}

export function TripsList({
  limit,
  showActions = true,
  compact = false,
}: TripsListProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [trackingTrip, setTrackingTrip] = useState<any>(null);
  const [cancellingTrip, setCancellingTrip] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const user = currentUser.value;
  const isOwnerRole = isOwner.value;
  let tripsList = trips.value;
  const safesList = safes.value;

  if (!isOwnerRole && user) {
    const userSafeIds = safesList
      .filter((safe) => safe.assigned_to === user.id)
      .map((safe) => safe.id);
    tripsList = tripsList.filter((trip) => userSafeIds.includes(trip.safe_id));
  }

  if (limit) tripsList = tripsList.slice(0, limit);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "badge-neutral",
      in_transit: "badge-warning",
      delivered: "badge-success",
      cancelled: "badge-error",
    };
    return (
      <span
        className={`badge ${
          styles[status as keyof typeof styles] || "badge-neutral"
        } capitalize`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  const handleStatusChange = async (tripId: string, newStatus: any) => {
    setUpdatingStatus(tripId);
    try {
      await dataService.updateTripStatus(tripId, newStatus);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (tripsList.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No trips found.
      </div>
    );
  }

  const containerClass = compact
    ? "-mx-6 -mb-6 border-t border-gray-100"
    : "border border-gray-200 rounded-lg overflow-hidden";

  return (
    <>
      <div className={containerClass}>
        <ul className="divide-y divide-gray-100 bg-white">
          {tripsList.map((trip) => {
            const safe = safesList.find((s) => s.id === trip.safe_id);
            const isOverdue =
              isPast(new Date(trip.scheduled_delivery)) &&
              trip.status !== "delivered";
            const canTrack =
              safe && (safe.tracknetics_device_id || safe.tracking_device_id);

            return (
              <li
                key={trip.id}
                className="hover:bg-gray-50 transition-colors duration-150 px-6 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {trip.client_name}
                      </h4>
                      {getStatusBadge(trip.status)}
                      {isOverdue && (
                        <span className="badge badge-error">Overdue</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {trip.delivery_address}
                        </span>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span>
                          {format(
                            new Date(trip.scheduled_pickup),
                            "MMM d, HH:mm"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {showActions && (
                    <div className="flex items-center gap-2 shrink-0">
                      {updatingStatus === trip.id ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        <>
                          {trip.status === "in_transit" && canTrack && (
                            <button
                              onClick={() => setTrackingTrip(trip)}
                              className="btn btn-ghost text-brand hover:text-brand-hover p-2"
                              title="Live Tracking"
                            >
                              <Navigation className="h-4 w-4" />
                            </button>
                          )}

                          {trip.status === "pending" && (
                            <button
                              onClick={() => setCancellingTrip(trip.id)}
                              className="btn btn-ghost text-red-600 hover:text-red-700 p-2"
                              title="Cancel Trip"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}

                          {trip.status === "in_transit" && (
                            <button
                              onClick={() =>
                                handleStatusChange(trip.id, "delivered")
                              }
                              className="btn btn-primary text-xs py-1 h-7 px-2"
                            >
                              Complete
                            </button>
                          )}

                          {trip.tracking_token && (
                            <button
                              onClick={() =>
                                window.open(
                                  dataService.generateTrackingUrl(
                                    trip.tracking_token!
                                  ),
                                  "_blank"
                                )
                              }
                              className="btn btn-ghost p-2 text-gray-400 hover:text-gray-600"
                              title="Customer Link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {trackingTrip && (
        <TripTrackingModal
          trip={trackingTrip}
          onClose={() => setTrackingTrip(null)}
        />
      )}

      {cancellingTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Cancel Trip
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will cancel the scheduled transport. This action cannot be
              undone.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason *
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand focus:border-transparent"
                rows={3}
                placeholder="Why is this trip being cancelled?"
                value={cancelReason}
                onInput={(e) =>
                  setCancelReason((e.target as HTMLTextAreaElement).value)
                }
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 10 characters. This will be logged for records.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setCancellingTrip(null);
                  setCancelReason("");
                }}
                className="btn btn-secondary"
              >
                Keep Trip
              </button>
              <button
                onClick={async () => {
                  if (!cancelReason.trim()) {
                    toast.error("Please provide a cancellation reason");
                    return;
                  }

                  if (cancelReason.trim().length < 10) {
                    toast.error("Reason must be at least 10 characters");
                    return;
                  }

                  const result = await dataService.cancelTrip(
                    cancellingTrip,
                    cancelReason
                  );
                  if (!result.success) {
                    toast.error(result.error || "Failed to cancel trip");
                  }

                  setCancellingTrip(null);
                  setCancelReason("");
                }}
                className="btn btn-danger"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
