import { useState, useEffect } from "preact/hooks";
import {
  X,
  Package,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  AlertTriangle,
  Copy,
  ExternalLink,
} from "lucide-preact";
import { dataService, type TripBookingData } from "../services/data";
import { LoadingSpinner } from "./LoadingSpinner";
import type { Safe } from "../types";

interface CreateTripModalProps {
  onClose: () => void;
  availableSafes: Safe[];
  editTrip?: any; // For editing existing trips
}

export function CreateTripModal({
  onClose,
  availableSafes,
  editTrip,
}: CreateTripModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<TripBookingData>({
    safe_id: editTrip?.safe_id || "",
    client_name: editTrip?.client_name || "",
    client_phone: editTrip?.client_phone || "",
    client_email: editTrip?.client_email || "",
    pickup_address: editTrip?.pickup_address || "",
    pickup_contact_name: editTrip?.pickup_contact_name || "",
    pickup_contact_phone: editTrip?.pickup_contact_phone || "",
    delivery_address: editTrip?.delivery_address || "",
    delivery_contact_name: editTrip?.delivery_contact_name || "",
    delivery_contact_phone: editTrip?.delivery_contact_phone || "",
    scheduled_pickup: editTrip?.scheduled_pickup || "",
    scheduled_delivery: editTrip?.scheduled_delivery || "",
    priority: editTrip?.priority || "normal",
    special_instructions: editTrip?.special_instructions || "",
    delivery_notes: editTrip?.delivery_notes || "",
    requires_signature: editTrip?.requires_signature || false,
    recurring: {
      enabled: false,
      frequency: "weekly",
      days_of_week: [],
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);

  const steps = [
    { id: 1, title: "Basic Info", description: "Client and safe details" },
    { id: 2, title: "Addresses", description: "Pickup and delivery" },
    { id: 3, title: "Schedule", description: "Times and priority" },
  ];

  // Validate current step
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.safe_id && formData.client_name.trim());
      case 2:
        return !!(
          formData.pickup_address.trim() && formData.delivery_address.trim()
        );
      case 3:
        return !!(formData.scheduled_pickup && formData.scheduled_delivery);
      default:
        return true;
    }
  };

  // Check for conflicts when schedule changes
  useEffect(() => {
    if (
      formData.safe_id &&
      formData.scheduled_pickup &&
      formData.scheduled_delivery
    ) {
      checkConflicts();
    }
  }, [
    formData.safe_id,
    formData.scheduled_pickup,
    formData.scheduled_delivery,
  ]);

  const checkConflicts = async () => {
    try {
      const conflictList = await dataService.checkSchedulingConflicts(
        formData.safe_id,
        formData.scheduled_pickup,
        formData.scheduled_delivery,
        editTrip?.id
      );
      setConflicts(conflictList);
    } catch (error) {
      console.error("Error checking conflicts:", error);
    }
  };

  const handleSubmit = async () => {
    console.log("🚀 Submit clicked - Current step:", currentStep);
    console.log("📋 Form data:", formData);

    setError("");
    setLoading(true);

    try {
      // Validate all data using the data service
      if (dataService.validateTripData) {
        console.log("✅ Starting validation...");
        const validation = dataService.validateTripData(
          formData,
          availableSafes
        );

        console.log("📊 Validation result:", validation);

        if (!validation.isValid) {
          setError(validation.errors.join(", "));
          setLoading(false);
          return;
        }

        setWarnings(validation.warnings);
      }

      console.log("💾 Calling createTrip...");
      let result;
      if (editTrip && dataService.updateTrip) {
        result = await dataService.updateTrip(editTrip.id, formData);
      } else {
        result = await dataService.createTrip(formData);
      }

      console.log("📥 Result:", result);

      if (result.success) {
        console.log("✅ Trip created successfully!");
        onClose();
      } else {
        console.error("❌ Trip creation failed:", result.error);
        setError(result.error || "Failed to save trip");
      }
    } catch (err) {
      console.error("💥 Exception:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const setDefaultTimes = () => {
    const now = new Date();
    const pickup = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const delivery = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    setFormData((prev) => ({
      ...prev,
      scheduled_pickup: pickup.toISOString().slice(0, 16),
      scheduled_delivery: delivery.toISOString().slice(0, 16),
    }));
  };

  const copyAddresses = () => {
    setFormData((prev) => ({
      ...prev,
      delivery_address: prev.pickup_address,
      delivery_contact_name: prev.pickup_contact_name,
      delivery_contact_phone: prev.pickup_contact_phone,
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Basic Information
            </h3>

            {/* Safe Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Safe *
              </label>
              <div className="relative">
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
                      Safe {safe.serial_number} (Battery: {safe.battery_level}%,
                      Status: {safe.status})
                    </option>
                  ))}
                </select>
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Client Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="input pl-10"
                    placeholder="Client full name"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Phone
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    className="input pl-10"
                    placeholder="+27 (87) 123 4567"
                    value={formData.client_phone}
                    onInput={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        client_phone: (e.target as HTMLInputElement).value,
                      }))
                    }
                  />
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="client@example.com"
                  value={formData.client_email}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      client_email: (e.target as HTMLInputElement).value,
                    }))
                  }
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Trip confirmation will be sent to this email address
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority Level
              </label>
              <select
                className="input"
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: (e.target as HTMLSelectElement).value as any,
                  }))
                }
              >
                <option value="low">Low Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Pickup & Delivery Addresses
              </h3>
              <button
                type="button"
                onClick={copyAddresses}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Copy className="h-4 w-4" />
                <span>Copy pickup to delivery</span>
              </button>
            </div>
            {/* Pickup Address */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Pickup Location
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    className="input"
                    placeholder="Enter full pickup address"
                    value={formData.pickup_address}
                    onInput={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pickup_address: (e.target as HTMLTextAreaElement).value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Contact person"
                      value={formData.pickup_contact_name}
                      onInput={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          pickup_contact_name: (e.target as HTMLInputElement)
                            .value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="Contact number"
                      value={formData.pickup_contact_phone}
                      onInput={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          pickup_contact_phone: (e.target as HTMLInputElement)
                            .value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Delivery Address */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Delivery Location
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    className="input"
                    placeholder="Enter full delivery address"
                    value={formData.delivery_address}
                    onInput={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        delivery_address: (e.target as HTMLTextAreaElement)
                          .value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Contact person"
                      value={formData.delivery_contact_name}
                      onInput={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          delivery_contact_name: (e.target as HTMLInputElement)
                            .value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="Contact number"
                      value={formData.delivery_contact_phone}
                      onInput={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          delivery_contact_phone: (e.target as HTMLInputElement)
                            .value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Information */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Who Will Receive This Delivery?
              </h4>

              {/* Same as Client Toggle */}
              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="checkbox"
                  id="recipient_is_client"
                  checked={formData.recipient_is_client ?? false}
                  onChange={(e) => {
                    const isClient = (e.target as HTMLInputElement).checked;
                    setFormData((prev) => ({
                      ...prev,
                      recipient_is_client: isClient,
                      // Auto-fill if same as client
                      recipient_name: isClient ? prev.client_name : "",
                      recipient_email: isClient ? prev.client_email : "",
                      recipient_phone: isClient ? prev.client_phone : "",
                    }));
                  }}
                />
                <label
                  htmlFor="recipient_is_client"
                  className="text-sm font-medium text-purple-800"
                >
                  Client is the recipient (receiving the delivery themselves)
                </label>
              </div>

              {/* Recipient Details (only show if NOT same as client) */}
              {!formData.recipient_is_client && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      required={!formData.recipient_is_client}
                      className="input"
                      placeholder="Person receiving the delivery"
                      value={formData.recipient_name || ""}
                      onInput={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recipient_name: (e.target as HTMLInputElement).value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Email *
                      </label>
                      <input
                        type="email"
                        required={!formData.recipient_is_client}
                        className="input"
                        placeholder="For OTP delivery"
                        value={formData.recipient_email || ""}
                        onInput={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            recipient_email: (e.target as HTMLInputElement)
                              .value,
                          }))
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        OTP will be sent here
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Phone
                      </label>
                      <input
                        type="tel"
                        className="input"
                        placeholder="Optional"
                        value={formData.recipient_phone || ""}
                        onInput={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            recipient_phone: (e.target as HTMLInputElement)
                              .value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
                <p className="font-medium mb-1">Email Confirmation:</p>
                <ul className="space-y-1">
                  <li>
                    •{" "}
                    <strong>
                      Client ({formData.client_name || "Booking person"})
                    </strong>
                    : Gets booking confirmation + tracking link
                  </li>
                  <li>
                    •{" "}
                    <strong>
                      Recipient (
                      {formData.recipient_is_client
                        ? "Same person"
                        : formData.recipient_name || "Receiving person"}
                      )
                    </strong>
                    : Gets arrival notification + OTP to unlock
                  </li>
                </ul>
              </div>
            </div>
            {/* Special Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions
              </label>
              <textarea
                rows={3}
                className="input"
                placeholder="Any special handling or delivery instructions..."
                value={formData.special_instructions}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    special_instructions: (e.target as HTMLTextAreaElement)
                      .value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Notes
              </label>
              <textarea
                rows={2}
                className="input"
                placeholder="Additional notes for delivery..."
                value={formData.delivery_notes}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    delivery_notes: (e.target as HTMLTextAreaElement).value,
                  }))
                }
              />
            </div>
            {/* Signature Requirement */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="signature"
                checked={formData.requires_signature}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    requires_signature: (e.target as HTMLInputElement).checked,
                  }))
                }
              />
              <label
                htmlFor="signature"
                className="text-sm font-medium text-gray-700"
              >
                Requires signature on delivery
              </label>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Schedule & Review
              </h3>
              <button
                type="button"
                onClick={setDefaultTimes}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Set default times
              </button>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Time *
                </label>
                <div className="relative">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Time *
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    required
                    className="input pl-10"
                    value={formData.scheduled_delivery}
                    onInput={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduled_delivery: (e.target as HTMLInputElement)
                          .value,
                      }))
                    }
                  />
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Conflicts Warning */}
            {conflicts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-800">
                    Scheduling Conflicts
                  </h4>
                </div>
                {conflicts.map((conflict, index) => (
                  <p key={index} className="text-sm text-red-700">
                    Conflicts with trip for {conflict.client_name} on{" "}
                    {new Date(conflict.scheduled_pickup).toLocaleString()}
                  </p>
                ))}
              </div>
            )}

            {/* Recurring Options */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.recurring?.enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recurring: {
                        ...prev.recurring!,
                        enabled: (e.target as HTMLInputElement).checked,
                      },
                    }))
                  }
                />
                <label
                  htmlFor="recurring"
                  className="font-medium text-blue-800"
                >
                  Make this a recurring trip (optional)
                </label>
              </div>

              {formData.recurring?.enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      className="input"
                      value={formData.recurring.frequency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurring: {
                            ...prev.recurring!,
                            frequency: (e.target as HTMLSelectElement)
                              .value as any,
                          },
                        }))
                      }
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (optional)
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={formData.recurring.end_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recurring: {
                            ...prev.recurring!,
                            end_date: (e.target as HTMLInputElement).value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Trip Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">Trip Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Client:</span>
                  <p>{formData.client_name}</p>
                  {formData.client_phone && (
                    <p className="text-gray-600">{formData.client_phone}</p>
                  )}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Safe:</span>
                  <p>
                    {
                      availableSafes.find((s) => s.id === formData.safe_id)
                        ?.serial_number
                    }
                  </p>
                  <p className="text-gray-600">Priority: {formData.priority}</p>
                </div>
              </div>

              <div>
                <span className="font-medium text-gray-700">Pickup:</span>
                <p className="text-sm">{formData.pickup_address}</p>
                <p className="text-xs text-gray-600">
                  {formData.scheduled_pickup &&
                    new Date(formData.scheduled_pickup).toLocaleString()}
                </p>
              </div>

              <div>
                <span className="font-medium text-gray-700">Delivery:</span>
                <p className="text-sm">{formData.delivery_address}</p>
                <p className="text-xs text-gray-600">
                  {formData.scheduled_delivery &&
                    new Date(formData.scheduled_delivery).toLocaleString()}
                </p>
              </div>

              {formData.special_instructions && (
                <div>
                  <span className="font-medium text-gray-700">
                    Instructions:
                  </span>
                  <p className="text-sm">{formData.special_instructions}</p>
                </div>
              )}
            </div>

            {/* Customer Tracking Info */}
            {formData.client_email && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium text-blue-800">
                    Customer Tracking
                  </h4>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                  A secure tracking link will be automatically sent to:{" "}
                  <strong>{formData.client_email}</strong>
                </p>
                <p className="text-xs text-blue-600">
                  The customer will receive real-time updates on their secure
                  transport without accessing your dashboard.
                </p>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Warnings</h4>
                </div>
                {warnings.map((warning, index) => (
                  <p key={index} className="text-sm text-yellow-700">
                    • {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {editTrip ? "Edit Trip" : "Book New Trip"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Step Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step.id}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p
                    className={`text-sm font-medium ${
                      currentStep >= step.id ? "text-blue-600" : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-4 ${
                      currentStep > step.id ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="mb-8">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            className="btn btn-secondary"
            disabled={currentStep === 1}
          >
            Previous
          </button>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>

            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="btn btn-primary"
                disabled={!validateStep(currentStep) || conflicts.length > 0}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={loading || conflicts.length > 0}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" className="mr-2" />
                    {editTrip ? "Updating..." : "Booking Trip..."}
                  </>
                ) : (
                  <>{editTrip ? "Update Trip" : "Book Trip"}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
