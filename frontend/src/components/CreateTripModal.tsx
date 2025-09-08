import { useState } from "preact/hooks";
import { X, Package, MapPin, Calendar, User } from "lucide-preact";
import { dataService } from "../services/data";
import { LoadingSpinner } from "./LoadingSpinner";
import type { Safe } from "../types";

interface CreateTripModalProps {
  onClose: () => void;
  availableSafes: Safe[];
}

export function CreateTripModal({
  onClose,
  availableSafes,
}: CreateTripModalProps) {
  const [formData, setFormData] = useState({
    safe_id: "",
    client_name: "",
    pickup_address: "",
    delivery_address: "",
    scheduled_pickup: "",
    scheduled_delivery: "",
    instructions: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");

    // Validate pickup is before delivery
    const pickupDate = new Date(formData.scheduled_pickup);
    const deliveryDate = new Date(formData.scheduled_delivery);

    if (deliveryDate <= pickupDate) {
      setError("Delivery time must be after pickup time");
      return;
    }

    setLoading(true);

    try {
      const result = await dataService.createTrip(formData);

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Failed to create trip");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Set default times (pickup in 2 hours, delivery in 4 hours)
  const setDefaultTimes = () => {
    const now = new Date();
    const pickup = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
    const delivery = new Date(now.getTime() + 4 * 60 * 60 * 1000); // +4 hours

    setFormData((prev) => ({
      ...prev,
      scheduled_pickup: pickup.toISOString().slice(0, 16),
      scheduled_delivery: delivery.toISOString().slice(0, 16),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Book New Trip</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {availableSafes.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded text-sm">
              No active safes available. Please ensure you have at least one
              active safe.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Select Safe *
            </label>
            <div className="mt-1 relative">
              <select
                required
                className="input pl-10"
                value={formData.safe_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    safe_id: (e.target as HTMLSelectElement).value,
                  }))
                }
              >
                <option value="">Choose a safe</option>
                {availableSafes.map((safe) => (
                  <option key={safe.id} value={safe.id}>
                    Safe {safe.serial_number} (Battery: {safe.battery_level}%)
                  </option>
                ))}
              </select>
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Client Name *
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                required
                className="input pl-10"
                placeholder="Enter client name"
                value={formData.client_name}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    client_name: (e.target as HTMLInputElement).value,
                  }))
                }
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pickup Address *
            </label>
            <div className="mt-1 relative">
              <textarea
                required
                rows={2}
                className="input pl-10 pt-2"
                placeholder="Enter pickup address"
                value={formData.pickup_address}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickup_address: (e.target as HTMLTextAreaElement).value,
                  }))
                }
              />
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Delivery Address *
            </label>
            <div className="mt-1 relative">
              <textarea
                required
                rows={2}
                className="input pl-10 pt-2"
                placeholder="Enter delivery address"
                value={formData.delivery_address}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    delivery_address: (e.target as HTMLTextAreaElement).value,
                  }))
                }
              />
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Pickup Time *
              </label>
              <div className="mt-1 relative">
                <input
                  type="datetime-local"
                  required
                  className="input pl-10"
                  value={formData.scheduled_pickup}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheduled_pickup: (e.target as HTMLInputElement).value,
                    }))
                  }
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Delivery Time *
              </label>
              <div className="mt-1 relative">
                <input
                  type="datetime-local"
                  required
                  className="input pl-10"
                  value={formData.scheduled_delivery}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      scheduled_delivery: (e.target as HTMLInputElement).value,
                    }))
                  }
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={setDefaultTimes}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Set default times (pickup in 2hrs, delivery in 4hrs)
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Special Instructions
            </label>
            <textarea
              rows={3}
              className="mt-1 input"
              placeholder="Any special instructions for pickup or delivery..."
              value={formData.instructions}
              onInput={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  instructions: (e.target as HTMLTextAreaElement).value,
                }))
              }
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || availableSafes.length === 0}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  Booking...
                </>
              ) : (
                "Book Trip"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
