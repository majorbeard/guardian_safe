import { useState, useEffect } from "preact/hooks";
import {
  Plus,
  Search,
  Filter,
  MapPin,
  User,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
} from "lucide-preact";
import { trips, safes } from "../store/realtime";
import { realtimeActions } from "../store/realtime";
import { apiService } from "../services/api";
import { authState } from "../store/auth";
import Button from "../components/Button";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { useToast } from "../components/NotificationToast";
import type { Trip, TripStatus } from "../types";
import { format, isToday, isPast, isFuture } from "date-fns";
import { ConfirmDialog } from "../components/ConfirmDialog";

export default function TripsPage() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "upcoming" | "overdue"
  >("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Trip | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const tripsList = trips.value;
  const safesList = safes.value;
  const user = authState.value.user;
  const isAdmin = user?.role === "admin";
  const toast = useToast();

  useEffect(() => {
    loadTrips();
  }, [currentPage]);

  const loadTrips = async () => {
    setLoading(true);
    const [tripsResponse, safesResponse] = await Promise.all([
      apiService.getTrips(currentPage, 20),
      apiService.getSafes(),
    ]);

    if (tripsResponse.success && tripsResponse.data) {
      realtimeActions.setTrips(tripsResponse.data.data);
      setTotalPages(
        Math.ceil(tripsResponse.data.total / tripsResponse.data.limit)
      );
    }

    if (safesResponse.success && safesResponse.data) {
      realtimeActions.setSafes(safesResponse.data);
    }

    setLoading(false);
  };

  // Filter trips based on search and filters
  const filteredTrips = tripsList.filter((trip) => {
    const matchesSearch =
      searchTerm === "" ||
      trip.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.assignedCourier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || trip.status === statusFilter;

    const matchesDate = (() => {
      if (dateFilter === "all") return true;
      const deliveryDate = new Date(trip.scheduledDelivery);

      switch (dateFilter) {
        case "today":
          return isToday(deliveryDate);
        case "upcoming":
          return isFuture(deliveryDate);
        case "overdue":
          return (
            isPast(deliveryDate) &&
            !["delivered", "cancelled"].includes(trip.status)
          );
        default:
          return true;
      }
    })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  const CreateTripModal = () => {
    const [formData, setFormData] = useState({
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      pickupAddress: "",
      deliveryAddress: "",
      assignedCourier: "",
      assignedSafe: "",
      scheduledPickup: "",
      scheduledDelivery: "",
      instructions: "",
      value: "",
      priority: "normal" as "low" | "normal" | "high" | "urgent",
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const validateForm = (): boolean => {
      const errors: Record<string, string> = {};

      if (!formData.clientName.trim())
        errors.clientName = "Client name is required";
      if (!formData.clientEmail.trim())
        errors.clientEmail = "Client email is required";
      if (!formData.pickupAddress.trim())
        errors.pickupAddress = "Pickup address is required";
      if (!formData.deliveryAddress.trim())
        errors.deliveryAddress = "Delivery address is required";
      if (!formData.assignedCourier.trim())
        errors.assignedCourier = "Courier assignment is required";
      if (!formData.assignedSafe.trim())
        errors.assignedSafe = "Safe assignment is required";
      if (!formData.scheduledPickup)
        errors.scheduledPickup = "Pickup time is required";
      if (!formData.scheduledDelivery)
        errors.scheduledDelivery = "Delivery time is required";

      // Validate dates
      if (formData.scheduledPickup && formData.scheduledDelivery) {
        const pickup = new Date(formData.scheduledPickup);
        const delivery = new Date(formData.scheduledDelivery);
        if (delivery <= pickup) {
          errors.scheduledDelivery = "Delivery must be after pickup";
        }
      }

      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: Event) => {
      e.preventDefault();

      if (!validateForm()) return;

      setSubmitting(true);

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
          toast.success(
            "Trip Created",
            "New trip has been created successfully"
          );
          resetForm();
        } else {
          toast.error(
            "Creation Failed",
            response.error || "Failed to create trip"
          );
        }
      } catch (error) {
        console.error("Failed to create trip:", error);
        toast.error("Network Error", "Please try again");
      } finally {
        setSubmitting(false);
      }
    };

    const resetForm = () => {
      setFormData({
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        pickupAddress: "",
        deliveryAddress: "",
        assignedCourier: "",
        assignedSafe: "",
        scheduledPickup: "",
        scheduledDelivery: "",
        instructions: "",
        value: "",
        priority: "normal",
      });
      setFormErrors({});
    };

    return (
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Trip"
        size="lg"
      >
        <form onSubmit={handleSubmit} class="p-6 space-y-6">
          {/* Client Information */}
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">
              Client Information
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      clientName: (e.target as HTMLInputElement).value,
                    }))
                  }
                  class={`mt-1 block w-full border rounded-md px-3 py-2 ${
                    formErrors.clientName
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  required
                />
                {formErrors.clientName && (
                  <p class="mt-1 text-sm text-red-600">
                    {formErrors.clientName}
                  </p>
                )}
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      clientEmail: (e.target as HTMLInputElement).value,
                    }))
                  }
                  class={`mt-1 block w-full border rounded-md px-3 py-2 ${
                    formErrors.clientEmail
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  required
                />
                {formErrors.clientEmail && (
                  <p class="mt-1 text-sm text-red-600">
                    {formErrors.clientEmail}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.clientPhone}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientPhone: (e.target as HTMLInputElement).value,
                  }))
                }
                class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Addresses */}
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">Addresses</h3>
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Pickup Address *
              </label>
              <textarea
                value={formData.pickupAddress}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickupAddress: (e.target as HTMLTextAreaElement).value,
                  }))
                }
                rows={2}
                class={`mt-1 block w-full border rounded-md px-3 py-2 ${
                  formErrors.pickupAddress
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                required
              />
              {formErrors.pickupAddress && (
                <p class="mt-1 text-sm text-red-600">
                  {formErrors.pickupAddress}
                </p>
              )}
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Delivery Address *
              </label>
              <textarea
                value={formData.deliveryAddress}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: (e.target as HTMLTextAreaElement).value,
                  }))
                }
                rows={2}
                class={`mt-1 block w-full border rounded-md px-3 py-2 ${
                  formErrors.deliveryAddress
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
                required
              />
              {formErrors.deliveryAddress && (
                <p class="mt-1 text-sm text-red-600">
                  {formErrors.deliveryAddress}
                </p>
              )}
            </div>
          </div>

          {/* Assignment & Schedule */}
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">
              Assignment & Schedule
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Assigned Courier *
                </label>
                <input
                  type="text"
                  value={formData.assignedCourier}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      assignedCourier: (e.target as HTMLInputElement).value,
                    }))
                  }
                  class={`mt-1 block w-full border rounded-md px-3 py-2 ${
                    formErrors.assignedCourier
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  placeholder="Enter courier name"
                  required
                />
                {formErrors.assignedCourier && (
                  <p class="mt-1 text-sm text-red-600">
                    {formErrors.assignedCourier}
                  </p>
                )}
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Assigned Safe *
                </label>
                <select
                  value={formData.assignedSafe}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      assignedSafe: (e.target as HTMLSelectElement).value,
                    }))
                  }
                  class={`mt-1 block w-full border rounded-md px-3 py-2 ${
                    formErrors.assignedSafe
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  required
                >
                  <option value="">Select a safe</option>
                  {safesList
                    .filter(
                      (safe) => safe.status === "active" && !safe.assignedTrip
                    )
                    .map((safe) => (
                      <option key={safe.id} value={safe.id}>
                        Safe {safe.serialNumber} (Battery: {safe.batteryLevel}%)
                      </option>
                    ))}
                </select>
                {formErrors.assignedSafe && (
                  <p class="mt-1 text-sm text-red-600">
                    {formErrors.assignedSafe}
                  </p>
                )}
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Scheduled Pickup *
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledPickup}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheduledPickup: (e.target as HTMLInputElement).value,
                    }))
                  }
                  class={`mt-1 block w-full border rounded-md px-3 py-2 ${
                    formErrors.scheduledPickup
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  required
                />
                {formErrors.scheduledPickup && (
                  <p class="mt-1 text-sm text-red-600">
                    {formErrors.scheduledPickup}
                  </p>
                )}
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Scheduled Delivery *
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledDelivery}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheduledDelivery: (e.target as HTMLInputElement).value,
                    }))
                  }
                  class={`mt-1 block w-full border rounded-md px-3 py-2 ${
                    formErrors.scheduledDelivery
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                  required
                />
                {formErrors.scheduledDelivery && (
                  <p class="mt-1 text-sm text-red-600">
                    {formErrors.scheduledDelivery}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div class="space-y-4">
            <h3 class="text-lg font-medium text-gray-900">
              Additional Details
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Priority Level
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: (e.target as HTMLSelectElement).value as any,
                    }))
                  }
                  class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Package Value (R)
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      value: (e.target as HTMLInputElement).value,
                    }))
                  }
                  class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">
                Special Instructions
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
                class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any special delivery instructions..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
      </Modal>
    );
  };

  const TripDetailsModal = ({ trip }: { trip: Trip }) => {
    const assignedSafe = safesList.find(
      (safe) => safe.id === trip.assignedSafe
    );
    const [updating, setUpdating] = useState(false);

    const handleStatusUpdate = async (newStatus: TripStatus) => {
      setUpdating(true);
      try {
        const response = await apiService.updateTrip(trip.id, {
          status: newStatus,
        });
        if (response.success && response.data) {
          realtimeActions.updateTrip(trip.id, response.data);
          toast.success(
            "Status Updated",
            `Trip status changed to ${newStatus}`
          );
        } else {
          toast.error(
            "Update Failed",
            response.error || "Failed to update trip status"
          );
        }
      } catch (error) {
        toast.error("Network Error", "Please try again");
      } finally {
        setUpdating(false);
      }
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case "urgent":
          return "text-red-600 bg-red-50";
        case "high":
          return "text-orange-600 bg-orange-50";
        case "normal":
          return "text-blue-600 bg-blue-50";
        case "low":
          return "text-gray-600 bg-gray-50";
        default:
          return "text-blue-600 bg-blue-50";
      }
    };

    return (
      <Modal
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        title={`Trip Details - ${trip.clientName}`}
        size="xl"
      >
        <div class="p-6 space-y-6">
          {/* Status Actions Bar */}
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-3">
              <StatusBadge status={trip.status} type="trip" />
              <span
                class={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                  trip.priority || "normal"
                )}`}
              >
                {(trip.priority || "normal").toUpperCase()} Priority
              </span>
            </div>
            <div class="flex space-x-2">
              {trip.status === "pending" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate("assigned")}
                  loading={updating}
                >
                  Assign
                </Button>
              )}
              {trip.status === "assigned" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate("in_transit")}
                  loading={updating}
                >
                  Start Transit
                </Button>
              )}
              {trip.status === "in_transit" && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleStatusUpdate("delivered")}
                  loading={updating}
                >
                  Mark Delivered
                </Button>
              )}
              {!["delivered", "cancelled"].includes(trip.status) && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleStatusUpdate("cancelled")}
                  loading={updating}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Trip Information Grid */}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900">
                Trip Information
              </h3>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-sm font-medium text-gray-500">
                    Trip ID
                  </label>
                  <p class="text-sm font-mono text-gray-900">{trip.id}</p>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-500">
                    Created
                  </label>
                  <p class="text-sm text-gray-900">
                    {format(new Date(trip.createdAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-500">
                  Client Name
                </label>
                <p class="text-lg font-medium text-gray-900">
                  {trip.clientName}
                </p>
              </div>

              {trip.clientEmail && (
                <div>
                  <label class="text-sm font-medium text-gray-500">
                    Client Email
                  </label>
                  <p class="text-sm text-gray-900">{trip.clientEmail}</p>
                </div>
              )}

              <div>
                <label class="text-sm font-medium text-gray-500">
                  Assigned Courier
                </label>
                <p class="text-sm text-gray-900">{trip.assignedCourier}</p>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-500">
                  Assigned Safe
                </label>
                <div class="flex items-center space-x-2">
                  <p class="text-sm text-gray-900">
                    {assignedSafe
                      ? `Safe ${assignedSafe.serialNumber}`
                      : trip.assignedSafe}
                  </p>
                  {assignedSafe && (
                    <span class="text-xs text-gray-500">
                      (Battery: {assignedSafe.batteryLevel}%,{" "}
                      {assignedSafe.isLocked ? "Locked" : "Unlocked"})
                    </span>
                  )}
                </div>
              </div>

              {trip.value && (
                <div>
                  <label class="text-sm font-medium text-gray-500">
                    Package Value
                  </label>
                  <p class="text-lg font-medium text-green-600">
                    R {trip.value.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Addresses & Schedule */}
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900">
                Addresses & Schedule
              </h3>

              <div>
                <label class="text-sm font-medium text-gray-500">
                  Pickup Address
                </label>
                <p class="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  {trip.pickupAddress}
                </p>
              </div>

              <div>
                <label class="text-sm font-medium text-gray-500">
                  Delivery Address
                </label>
                <p class="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                  {trip.deliveryAddress}
                </p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-sm font-medium text-gray-500">
                    Scheduled Pickup
                  </label>
                  <p class="text-sm text-gray-900">
                    {format(new Date(trip.scheduledPickup), "MMM d, yyyy")}
                  </p>
                  <p class="text-sm text-gray-600">
                    {format(new Date(trip.scheduledPickup), "h:mm a")}
                  </p>
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-500">
                    Scheduled Delivery
                  </label>
                  <p class="text-sm text-gray-900">
                    {format(new Date(trip.scheduledDelivery), "MMM d, yyyy")}
                  </p>
                  <p class="text-sm text-gray-600">
                    {format(new Date(trip.scheduledDelivery), "h:mm a")}
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
                      <p class="text-sm text-green-600 font-medium">
                        {format(new Date(trip.actualPickup), "MMM d, h:mm a")}
                      </p>
                    </div>
                  )}
                  {trip.actualDelivery && (
                    <div>
                      <label class="text-sm font-medium text-gray-500">
                        Actual Delivery
                      </label>
                      <p class="text-sm text-green-600 font-medium">
                        {format(new Date(trip.actualDelivery), "MMM d, h:mm a")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          {trip.instructions && (
            <div>
              <label class="text-sm font-medium text-gray-500">
                Special Instructions
              </label>
              <p class="text-sm text-gray-900 bg-blue-50 p-4 rounded-lg mt-2">
                {trip.instructions}
              </p>
            </div>
          )}

          {/* OTP Section */}
          {trip.otpCode && (
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-blue-700">
                    Current OTP Code
                  </label>
                  <p class="text-2xl font-mono font-bold text-blue-900">
                    {trip.otpCode}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-blue-600">Valid for 15 minutes</p>
                  <p class="text-xs text-blue-500">
                    Generated for courier access
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trip Timeline */}
          <div>
            <label class="text-sm font-medium text-gray-500 mb-3 block">
              Trip Timeline
            </label>
            <div class="space-y-3">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <CheckCircle class="h-4 w-4 text-white" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-900">Trip Created</p>
                  <p class="text-xs text-gray-500">
                    {format(new Date(trip.createdAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>

              {trip.actualPickup && (
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle class="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">
                      Package Picked Up
                    </p>
                    <p class="text-xs text-gray-500">
                      {format(
                        new Date(trip.actualPickup),
                        "MMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                </div>
              )}

              {trip.actualDelivery && (
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle class="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">
                      Package Delivered
                    </p>
                    <p class="text-xs text-gray-500">
                      {format(
                        new Date(trip.actualDelivery),
                        "MMM d, yyyy h:mm a"
                      )}
                    </p>
                  </div>
                </div>
              )}

              {trip.status === "cancelled" && (
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <XCircle class="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">
                      Trip Cancelled
                    </p>
                    <p class="text-xs text-gray-500">
                      Status updated by system
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  // Table columns configuration
  const columns = [
    {
      key: "clientName",
      label: "Client",
      sortable: true,
      render: (trip: Trip) => (
        <div>
          <p class="font-medium text-gray-900">{trip.clientName}</p>
          <p class="text-sm text-gray-500">#{trip.id.slice(-8)}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (trip: Trip) => <StatusBadge status={trip.status} type="trip" />,
    },
    {
      key: "assignedCourier",
      label: "Courier",
      sortable: true,
      render: (trip: Trip) => (
        <div class="flex items-center space-x-2">
          <User class="h-4 w-4 text-gray-400" />
          <span class="text-sm text-gray-900">{trip.assignedCourier}</span>
        </div>
      ),
    },
    {
      key: "assignedSafe",
      label: "Safe",
      sortable: false,
      render: (trip: Trip) => {
        const safe = safesList.find((s) => s.id === trip.assignedSafe);
        return (
          <div class="flex items-center space-x-2">
            <Shield class="h-4 w-4 text-gray-400" />
            <span class="text-sm text-gray-900">
              {safe ? safe.serialNumber : trip.assignedSafe}
            </span>
          </div>
        );
      },
    },
    {
      key: "scheduledDelivery",
      label: "Delivery",
      sortable: true,
      render: (trip: Trip) => (
        <div>
          <p class="text-sm text-gray-900">
            {format(new Date(trip.scheduledDelivery), "MMM d, yyyy")}
          </p>
          <p class="text-sm text-gray-500">
            {format(new Date(trip.scheduledDelivery), "h:mm a")}
          </p>
        </div>
      ),
    },
    {
      key: "deliveryAddress",
      label: "Location",
      sortable: false,
      render: (trip: Trip) => (
        <div class="flex items-center space-x-2 max-w-xs">
          <MapPin class="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span class="text-sm text-gray-900 truncate">
            {trip.deliveryAddress}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (trip: Trip) => (
        <div class="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTrip(trip);
            }}
            class="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye class="h-4 w-4" />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Open edit modal
                }}
                class="text-gray-600 hover:text-gray-800"
                title="Edit Trip"
              >
                <Edit class="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(trip);
                }}
                class="text-red-600 hover:text-red-800"
                title="Delete Trip"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const getStatusCounts = () => {
    return {
      all: tripsList.length,
      pending: tripsList.filter((t) => t.status === "pending").length,
      assigned: tripsList.filter((t) => t.status === "assigned").length,
      in_transit: tripsList.filter((t) => t.status === "in_transit").length,
      delivered: tripsList.filter((t) => t.status === "delivered").length,
      cancelled: tripsList.filter((t) => t.status === "cancelled").length,
      failed: tripsList.filter((t) => t.status === "failed").length,
    };
  };

  const statusCounts = getStatusCounts();

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

      {/* Quick Stats */}
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div
            key={status}
            class={`p-3 rounded-lg border cursor-pointer transition-colors ${
              statusFilter === status ||
              (status === "all" && statusFilter === "all")
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setStatusFilter(status as any)}
          >
            <div class="text-center">
              <div class="text-lg font-bold text-gray-900">{count}</div>
              <div class="text-xs text-gray-500 capitalize">
                {status === "in_transit" ? "In Transit" : status}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div class="flex-1">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search trips by client, courier, address, or ID..."
                value={searchTerm}
                onInput={(e) =>
                  setSearchTerm((e.target as HTMLInputElement).value)
                }
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <Filter class="h-4 w-4 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter((e.target as HTMLSelectElement).value as any)
                }
                class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                /* TODO: Export trips */
              }}
            >
              <Download class="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <DataTable
        data={filteredTrips}
        columns={columns}
        loading={loading}
        searchable={false} // We have custom search
        onRowClick={(trip) => setSelectedTrip(trip)}
        pagination={{
          page: currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Modals */}
      {showCreateModal && <CreateTripModal />}
      {selectedTrip && <TripDetailsModal trip={selectedTrip} />}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={async () => {
          if (showDeleteConfirm) {
            try {
              const response = await apiService.updateTrip(
                showDeleteConfirm.id,
                { status: "cancelled" }
              );
              if (response.success) {
                realtimeActions.updateTrip(showDeleteConfirm.id, {
                  status: "cancelled",
                });
                toast.success(
                  "Trip Cancelled",
                  "Trip has been cancelled successfully"
                );
              } else {
                toast.error(
                  "Cancellation Failed",
                  response.error || "Failed to cancel trip"
                );
              }
            } catch (error) {
              toast.error("Network Error", "Please try again");
            }
          }
        }}
        title="Cancel Trip"
        message={`Are you sure you want to cancel the trip for ${showDeleteConfirm?.clientName}? This action cannot be undone.`}
        confirmText="Cancel Trip"
        type="danger"
      />
    </div>
  );
}
