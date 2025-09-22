import { useState } from "preact/hooks";
import {
  Package,
  MapPin,
  Calendar,
  User,
  Clock,
  Navigation,
} from "lucide-preact";
import { trips, safes } from "../store/data";
import { currentUser, isOwner } from "../store/auth";
import { dataService } from "../services/data";
import { LoadingSpinner } from "./LoadingSpinner";
import { TripTrackingModal } from "./TripTrackingModal";
import { format, isToday, isPast } from "date-fns";
import { Copy, ExternalLink } from "lucide-preact";

interface TripsListProps {
  limit?: number;
  showActions?: boolean;
}

export function TripsList({ limit, showActions = true }: TripsListProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [copyingTracking, setCopyingTracking] = useState<string | null>(null);
  const [trackingTrip, setTrackingTrip] = useState<any>(null);

  const user = currentUser.value;
  const isOwnerRole = isOwner.value;

  let tripsList = trips.value;
  const safesList = safes.value;

  // Filter trips based on user role
  if (!isOwnerRole && user) {
    const userSafeIds = safesList
      .filter((safe) => safe.assigned_to === user.id)
      .map((safe) => safe.id);
    tripsList = tripsList.filter((trip) => userSafeIds.includes(trip.safe_id));
  }

  // Apply limit if specified
  if (limit) {
    tripsList = tripsList.slice(0, limit);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-blue-600 bg-blue-100";
      case "in_transit":
        return "text-yellow-600 bg-yellow-100";
      case "delivered":
        return "text-green-600 bg-green-100";
      case "cancelled":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getSafeInfo = (safeId: string) => {
    return safesList.find((safe) => safe.id === safeId);
  };

  const getTimeStatus = (scheduledTime: string) => {
    const time = new Date(scheduledTime);
    if (isPast(time)) return "text-red-600";
    if (isToday(time)) return "text-yellow-600";
    return "text-gray-600";
  };

  const handleStatusChange = async (tripId: string, newStatus: any) => {
    setUpdatingStatus(tripId);
    try {
      await dataService.updateTripStatus(tripId, newStatus);
    } catch (error) {
      console.error("Failed to update trip status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const copyTrackingUrl = async (trackingToken: string, tripId: string) => {
    setCopyingTracking(tripId);
    try {
      const trackingUrl = dataService.generateTrackingUrl(trackingToken);
      await navigator.clipboard.writeText(trackingUrl);
      setTimeout(() => setCopyingTracking(null), 1000);
    } catch (err) {
      console.error("Failed to copy tracking URL:", err);
      setCopyingTracking(null);
    }
  };

  const toggleTracking = async (tripId: string, currentEnabled: boolean) => {
    setUpdatingStatus(tripId);
    try {
      await dataService.toggleCustomerTracking(tripId, !currentEnabled);
    } catch (error) {
      console.error("Failed to toggle customer tracking:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Check if safe has tracking device
  const canTrackTrip = (safeId: string) => {
    const safe = getSafeInfo(safeId);
    return safe && (safe.tracknetics_device_id || safe.tracking_device_id);
  };

  if (tripsList.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Trips Found
        </h3>
        <p className="text-gray-500">
          {isOwnerRole
            ? "No trips have been booked yet"
            : "Book your first trip to get started"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tripsList.map((trip) => {
          const safe = getSafeInfo(trip.safe_id);
          const isOverdue =
            isPast(new Date(trip.scheduled_delivery)) &&
            trip.status !== "delivered";
          const canTrack = canTrackTrip(trip.safe_id);

          return (
            <div
              key={trip.id}
              className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                isOverdue ? "border-red-200 bg-red-50" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-2 rounded-lg ${
                      trip.status === "delivered"
                        ? "bg-green-100"
                        : trip.status === "in_transit"
                        ? "bg-yellow-100"
                        : trip.status === "cancelled"
                        ? "bg-gray-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <Package
                      className={`h-6 w-6 ${
                        trip.status === "delivered"
                          ? "text-green-600"
                          : trip.status === "in_transit"
                          ? "text-yellow-600"
                          : trip.status === "cancelled"
                          ? "text-gray-600"
                          : "text-blue-600"
                      }`}
                    />
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{trip.client_name}</span>
                    </h3>
                    <p className="text-sm text-gray-500">
                      Trip ID: {trip.id.slice(-8)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      trip.status
                    )}`}
                  >
                    {trip.status.replace("_", " ")}
                  </span>

                  {isOverdue && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100">
                      Overdue
                    </span>
                  )}

                  {/* Live Tracking Button - Only for in-transit trips with tracking devices */}
                  {trip.status === "in_transit" && canTrack && (
                    <button
                      onClick={() => setTrackingTrip(trip)}
                      className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium text-purple-600 bg-purple-100 hover:bg-purple-200 transition-colors"
                      title="Live GPS Tracking"
                    >
                      <Navigation className="h-4 w-4 mr-1" />
                      Live Tracking
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="flex items-start space-x-2 mb-2">
                    <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Pickup
                      </p>
                      <p className="text-sm text-gray-600">
                        {trip.pickup_address}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Delivery
                      </p>
                      <p className="text-sm text-gray-600">
                        {trip.delivery_address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">Pickup</p>
                    <p className={getTimeStatus(trip.scheduled_pickup)}>
                      {format(new Date(trip.scheduled_pickup), "MMM d, HH:mm")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">Delivery</p>
                    <p className={getTimeStatus(trip.scheduled_delivery)}>
                      {format(
                        new Date(trip.scheduled_delivery),
                        "MMM d, HH:mm"
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">Safe</p>
                    <p className="text-gray-600">
                      {safe ? safe.serial_number : "Unknown"}
                    </p>
                    {!canTrack && (
                      <p className="text-xs text-gray-400">No GPS tracker</p>
                    )}
                  </div>
                </div>
              </div>

              {trip && trip.special_instructions && (
                <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Instructions:</strong> {trip.special_instructions}
                  </p>
                </div>
              )}

              {/* Actions */}
              {showActions && (
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Created {format(new Date(trip.created_at), "MMM d, HH:mm")}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Customer Tracking Controls */}
                    {trip && trip.client_email && trip.tracking_token && (
                      <div className="flex items-center space-x-1 mr-3 border-r border-gray-200 pr-3">
                        {trip.customer_tracking_enabled ?? false ? (
                          <>
                            <button
                              onClick={() =>
                                copyTrackingUrl(trip.tracking_token!, trip.id)
                              }
                              disabled={copyingTracking === trip.id}
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                              title="Copy customer tracking link"
                            >
                              {copyingTracking === trip.id ? (
                                <LoadingSpinner size="small" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                              <span className="hidden sm:inline">
                                {copyingTracking === trip.id
                                  ? "Copied!"
                                  : "Copy Link"}
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                window.open(
                                  dataService.generateTrackingUrl(
                                    trip.tracking_token!
                                  ),
                                  "_blank"
                                )
                              }
                              className="text-green-600 hover:text-green-800 text-sm"
                              title="View customer tracking page"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() =>
                                toggleTracking(
                                  trip.id,
                                  trip.customer_tracking_enabled ?? false
                                )
                              }
                              className="text-red-600 hover:text-red-800 text-sm"
                              title="Disable customer tracking"
                            >
                              Hide
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              toggleTracking(
                                trip.id,
                                trip.customer_tracking_enabled ?? false
                              )
                            }
                            className="text-blue-600 hover:text-blue-800 text-sm"
                            title="Enable customer tracking"
                          >
                            Enable Tracking
                          </button>
                        )}
                      </div>
                    )}

                    {/* Status Change Actions */}
                    {updatingStatus === trip.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <>
                        {trip.status === "pending" && (
                          <button
                            onClick={() =>
                              handleStatusChange(trip.id, "in_transit")
                            }
                            className="text-yellow-600 hover:text-yellow-800 text-sm"
                          >
                            Start Transit
                          </button>
                        )}
                        {trip.status === "in_transit" && (
                          <button
                            onClick={() =>
                              handleStatusChange(trip.id, "delivered")
                            }
                            className="text-green-600 hover:text-green-800 text-sm"
                          >
                            Mark Delivered
                          </button>
                        )}
                        {trip.status !== "delivered" &&
                          trip.status !== "cancelled" && (
                            <button
                              onClick={() =>
                                handleStatusChange(trip.id, "cancelled")
                              }
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Cancel
                            </button>
                          )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trip Tracking Modal */}
      {trackingTrip && (
        <TripTrackingModal
          trip={trackingTrip}
          onClose={() => setTrackingTrip(null)}
        />
      )}
    </>
  );
}
