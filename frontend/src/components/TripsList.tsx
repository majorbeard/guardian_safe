import { useState } from "preact/hooks";
import { MapPin, Clock, Navigation, ExternalLink } from "lucide-preact";
import { trips, safes } from "../store/data";
import { currentUser, isOwner } from "../store/auth";
import { dataService } from "../services/data";
import { LoadingSpinner } from "./LoadingSpinner";
import { TripTrackingModal } from "./TripTrackingModal";
import { format, isPast } from "date-fns";

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
                              onClick={() =>
                                handleStatusChange(trip.id, "in_transit")
                              }
                              className="btn btn-secondary text-xs py-1 h-7 px-2"
                            >
                              Start
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
    </>
  );
}
