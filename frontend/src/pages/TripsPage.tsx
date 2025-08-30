import { useState, useEffect } from "preact/hooks";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Package,
  MapPin,
  User,
} from "lucide-preact";
import { trips, safes } from "../store/realtime";
import { realtimeActions } from "../store/realtime";
import { apiService } from "../services/api";
import { authState } from "../store/auth";
import Button from "../components/Button";
import Input from "../components/Input";
import StatusBadge from "../components/StatusBadge";
import type { Trip, TripStatus } from "../types";
import { format } from "date-fns";

export default function TripsPage() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const tripsList = trips.value;
  const safesList = safes.value;
  const user = authState.value.user;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const loadTrips = async () => {
      setLoading(true);
      const [tripsResponse, safesResponse] = await Promise.all([
        apiService.getTrips(1, 100),
        apiService.getSafes(),
      ]);

      if (tripsResponse.success && tripsResponse.data) {
        realtimeActions.setTrips(tripsResponse.data.data);
      }

      if (safesResponse.success && safesResponse.data) {
        realtimeActions.setSafes(safesResponse.data);
      }

      setLoading(false);
    };

    loadTrips();
  }, []);

  // Filter trips based on search and status
  const filteredTrips = tripsList.filter((trip) => {
    const matchesSearch =
      searchTerm === "" ||
      trip.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.assignedCourier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || trip.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const CreateTripModal = () => {
    const [formData, setFormData] = useState({
      clientName: "",
      pickupAddress: "",
      deliveryAddress: "",
      assignedCourier: "",
      assignedSafe: "",
      scheduledPickup: "",
      scheduledDelivery: "",
      instructions: "",
      value: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      setSubmitting(true);
      setError("");

      try {
        const tripData = {
          ...formData,
          scheduledPickup: new Date(formData.scheduledPickup),
          scheduledDelivery: new Date(formData.scheduledDelivery),
          value: formData.value ? parseFloat(formData.value) : undefined,
        };

        const response = await apiService.createTrip(tripData);

        if (response.success && response.data) {
          realtimeActions.addTrip(response.data);
          setShowCreateModal(false);
          setFormData({
            clientName: "",
            pickupAddress: "",
            deliveryAddress: "",
            assignedCourier: "",
            assignedSafe: "",
            scheduledPickup: "",
            scheduledDelivery: "",
            instructions: "",
            value: "",
          });
        } else {
          setError(response.error || "Failed to create trip");
        }
      } catch (error) {
        console.error("Failed to create trip:", error);
        setError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Create New Trip</h2>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              ×
            </Button>
          </div>

          <form onSubmit={(e) => handleSubmit(e)} class="space-y-4">
            {error && (
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div class="grid grid-cols-2 gap-4">
              <Input
                label="Client Name"
                value={formData.clientName}
                onInput={(value) =>
                  setFormData((prev) => ({ ...prev, clientName: value }))
                }
                required
              />
              <Input
                label="Assigned Courier"
                value={formData.assignedCourier}
                onInput={(value) =>
                  setFormData((prev) => ({ ...prev, assignedCourier: value }))
                }
                required
              />
            </div>

            <Input
              label="Pickup Address"
              value={formData.pickupAddress}
              onInput={(value) =>
                setFormData((prev) => ({ ...prev, pickupAddress: value }))
              }
              required
            />

            <Input
              label="Delivery Address"
              value={formData.deliveryAddress}
              onInput={(value) =>
                setFormData((prev) => ({ ...prev, deliveryAddress: value }))
              }
              required
            />

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Safe
                </label>
                <select
                  value={formData.assignedSafe}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      assignedSafe: (e.target as HTMLSelectElement).value,
                    }))
                  }
                  class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a safe</option>
                  {safesList
                    .filter(
                      (safe) => safe.status === "active" && !safe.assignedTrip
                    )
                    .map((safe) => (
                      <option key={safe.id} value={safe.id}>
                        Safe {safe.serialNumber} ({safe.batteryLevel}%)
                      </option>
                    ))}
                </select>
              </div>
              <Input
                label="Value (optional)"
                type="number"
                value={formData.value}
                onInput={(value) => setFormData((prev) => ({ ...prev, value }))}
                placeholder="0.00"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <Input
                label="Scheduled Pickup"
                type="datetime-local"
                value={formData.scheduledPickup}
                onInput={(value) =>
                  setFormData((prev) => ({ ...prev, scheduledPickup: value }))
                }
                required
              />
              <Input
                label="Scheduled Delivery"
                type="datetime-local"
                value={formData.scheduledDelivery}
                onInput={(value) =>
                  setFormData((prev) => ({ ...prev, scheduledDelivery: value }))
                }
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Instructions (optional)
              </label>
              <textarea
                value={formData.instructions}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    instructions: (e.target as HTMLTextAreaElement).value,
                  }))
                }
                rows={3}
                class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Special delivery instructions..."
              />
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={submitting}>
                Create Trip
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const TripDetailsModal = ({ trip }: { trip: Trip }) => {
    const assignedSafe = safesList.find(
      (safe) => safe.id === trip.assignedSafe
    );

    return (
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Trip Details</h2>
            <Button variant="ghost" onClick={() => setSelectedTrip(null)}>
              ×
            </Button>
          </div>

          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">Trip ID</label>
                <p class="text-sm font-mono text-gray-900">{trip.id}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">Status</label>
                <div class="mt-1">
                  <StatusBadge status={trip.status} type="trip" />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Client Name
                </label>
                <p class="text-sm text-gray-900">{trip.clientName}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Assigned Courier
                </label>
                <p class="text-sm text-gray-900">{trip.assignedCourier}</p>
              </div>
            </div>

            <div>
              <label class="text-sm font-medium text-gray-500">
                Pickup Address
              </label>
              <p class="text-sm text-gray-900">{trip.pickupAddress}</p>
            </div>

            <div>
              <label class="text-sm font-medium text-gray-500">
                Delivery Address
              </label>
              <p class="text-sm text-gray-900">{trip.deliveryAddress}</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Scheduled Pickup
                </label>
                <p class="text-sm text-gray-900">
                  {format(new Date(trip.scheduledPickup), "MMM d, yyyy h:mm a")}
                </p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Scheduled Delivery
                </label>
                <p class="text-sm text-gray-900">
                  {format(
                    new Date(trip.scheduledDelivery),
                    "MMM d, yyyy h:mm a"
                  )}
                </p>
              </div>
            </div>

            {(trip.actualPickup || trip.actualDelivery) && (
              <div class="grid grid-cols-2 gap-4">
                {trip.actualPickup && (
                  <div>
                    <label class="text-sm font-medium text-gray-500">
                      Actual Pickup
                    </label>
                    <p class="text-sm text-gray-900">
                      {format(
                        new Date(trip.actualPickup),
                        "MMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                )}
                {trip.actualDelivery && (
                  <div>
                    <label class="text-sm font-medium text-gray-500">
                      Actual Delivery
                    </label>
                    <p class="text-sm text-gray-900">
                      {format(
                        new Date(trip.actualDelivery),
                        "MMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Assigned Safe
                </label>
                <p class="text-sm text-gray-900">
                  {assignedSafe
                    ? `Safe ${assignedSafe.serialNumber}`
                    : trip.assignedSafe}
                </p>
                {assignedSafe && (
                  <p class="text-xs text-gray-500">
                    Battery: {assignedSafe.batteryLevel}% •{" "}
                    {assignedSafe.isLocked ? "Locked" : "Unlocked"}
                  </p>
                )}
              </div>
              {trip.value && (
                <div>
                  <label class="text-sm font-medium text-gray-500">Value</label>
                  <p class="text-sm text-gray-900">
                    R {trip.value.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {trip.instructions && (
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Instructions
                </label>
                <p class="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  {trip.instructions}
                </p>
              </div>
            )}

            {trip.otpCode && (
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label class="text-sm font-medium text-blue-700">
                  Current OTP Code
                </label>
                <p class="text-2xl font-mono font-bold text-blue-900">
                  {trip.otpCode}
                </p>
                <p class="text-xs text-blue-600 mt-1">Valid for 15 minutes</p>
              </div>
            )}

            <div class="pt-4 border-t border-gray-200">
              <label class="text-sm font-medium text-gray-500">
                Trip Timeline
              </label>
              <div class="mt-2 space-y-2">
                <div class="flex items-center space-x-2 text-sm">
                  <div class="w-2 h-2 bg-blue-500 rounded-full" />
                  <span class="text-gray-600">
                    Created:{" "}
                    {format(new Date(trip.createdAt), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                {trip.actualPickup && (
                  <div class="flex items-center space-x-2 text-sm">
                    <div class="w-2 h-2 bg-green-500 rounded-full" />
                    <span class="text-gray-600">
                      Picked up:{" "}
                      {format(
                        new Date(trip.actualPickup),
                        "MMM d, yyyy h:mm a"
                      )}
                    </span>
                  </div>
                )}
                {trip.actualDelivery && (
                  <div class="flex items-center space-x-2 text-sm">
                    <div class="w-2 h-2 bg-green-500 rounded-full" />
                    <span class="text-gray-600">
                      Delivered:{" "}
                      {format(
                        new Date(trip.actualDelivery),
                        "MMM d, yyyy h:mm a"
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
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

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Trip Management</h1>
          <p class="text-gray-600">Manage delivery trips and assignments</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus class="h-4 w-4 mr-2" />
            New Trip
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center space-x-4">
          <div class="flex-1">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search trips by client, courier, or address..."
                value={searchTerm}
                onInput={(e) =>
                  setSearchTerm((e.target as HTMLInputElement).value)
                }
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <Filter class="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  (e.target as HTMLSelectElement).value as TripStatus | "all"
                )
              }
              class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trips List */}
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">
            {filteredTrips.length} Trip{filteredTrips.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {filteredTrips.length === 0 ? (
          <div class="p-8 text-center">
            <Package class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">No trips found matching your criteria</p>
          </div>
        ) : (
          <div class="divide-y divide-gray-200">
            {filteredTrips.map((trip) => (
              <div
                key={trip.id}
                class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedTrip(trip)}
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-4">
                      <div>
                        <h3 class="font-medium text-gray-900">
                          {trip.clientName}
                        </h3>
                        <p class="text-sm text-gray-500">
                          Trip #{trip.id.slice(-8)}
                        </p>
                      </div>
                      <StatusBadge status={trip.status} type="trip" />
                    </div>

                    <div class="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div class="flex items-center space-x-2">
                        <User class="h-4 w-4" />
                        <span>{trip.assignedCourier}</span>
                      </div>
                      <div class="flex items-center space-x-2">
                        <MapPin class="h-4 w-4" />
                        <span class="truncate">{trip.deliveryAddress}</span>
                      </div>
                      <div class="flex items-center space-x-2">
                        <Calendar class="h-4 w-4" />
                        <span>
                          {format(
                            new Date(trip.scheduledDelivery),
                            "MMM d, h:mm a"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="text-right">
                    <p class="text-sm font-medium text-gray-900">
                      Safe{" "}
                      {safesList.find((s) => s.id === trip.assignedSafe)
                        ?.serialNumber || trip.assignedSafe}
                    </p>
                    {trip.value && (
                      <p class="text-sm text-gray-500">
                        R {trip.value.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateTripModal />}
      {selectedTrip && <TripDetailsModal trip={selectedTrip} />}
    </div>
  );
}
