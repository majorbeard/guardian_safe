import { useState } from "preact/hooks";
import {
  X,
  MapPin,
  Calendar,
  User,
  // Phone,
  // Mail,
  ArrowRight,
  AlertTriangle,
  Shield,
  Users,
} from "lucide-preact";
import { dataService, type TripBookingData } from "../services/data";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Restored FULL data structure matching your original logic
  const [formData, setFormData] = useState<TripBookingData>({
    safe_id: "",
    // Client (The person paying/booking)
    client_name: "",
    client_phone: "",
    client_email: "",

    // Recipient (The person receiving the OTP)
    recipient_is_client: true,
    recipient_name: "",
    recipient_email: "",
    recipient_phone: "",

    // Logistics
    pickup_address: "",
    pickup_contact_name: "",
    pickup_contact_phone: "",

    delivery_address: "",
    delivery_contact_name: "",
    delivery_contact_phone: "",

    scheduled_pickup: "",
    scheduled_delivery: "",
    priority: "normal",
    requires_signature: false,
    special_instructions: "",
    delivery_notes: "",
  });

  const steps = [
    { id: 1, title: "Client & Recipient", icon: User },
    { id: 2, title: "Locations", icon: MapPin },
    { id: 3, title: "Schedule", icon: Calendar },
  ];

  const handleNext = () => {
    setError("");
    // Basic validation per step
    if (currentStep === 1) {
      if (!formData.safe_id) return setError("Please select a safe.");
      if (!formData.client_name) return setError("Client Name is required.");
      // If recipient is NOT client, we need those details for the OTP
      if (!formData.recipient_is_client) {
        if (!formData.recipient_name || !formData.recipient_email) {
          return setError(
            "Recipient Name and Email are required for OTP delivery."
          );
        }
      }
    }
    if (currentStep === 2) {
      if (!formData.pickup_address || !formData.delivery_address) {
        return setError("Both Pickup and Delivery addresses are required.");
      }
    }
    setCurrentStep((c) => c + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await dataService.createTrip(formData);
      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Failed to book trip");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to auto-fill recipient if same as client
  const toggleRecipient = (isClient: boolean) => {
    setFormData((prev) => ({
      ...prev,
      recipient_is_client: isClient,
      // If switching back to client, clear the manual recipient fields to avoid confusion
      recipient_name: isClient ? "" : prev.recipient_name,
      recipient_email: isClient ? "" : prev.recipient_email,
      recipient_phone: isClient ? "" : prev.recipient_phone,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-2xl overflow-hidden animate-slide-up text-left">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Book New Transport
              </h3>
              <div className="flex items-center gap-4 mt-2">
                {steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`flex items-center text-xs font-medium ${
                      currentStep >= step.id ? "text-brand" : "text-gray-400"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 border ${
                        currentStep >= step.id
                          ? "bg-brand/5 border-brand"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      {step.id}
                    </span>
                    {step.title}
                    {idx < steps.length - 1 && (
                      <span className="mx-3 text-gray-300">/</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-50 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Line */}
          <div className="w-full bg-gray-50 h-0.5">
            <div
              className="bg-brand h-0.5 transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>

          {/* Content Body */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-md text-sm flex items-center animate-fade-in">
                <AlertTriangle className="h-4 w-4 mr-2" /> {error}
              </div>
            )}

            {/* STEP 1: Client & Recipient (Crucial for OTP) */}
            {currentStep === 1 && (
              <div className="space-y-8 animate-fade-in">
                {/* Section: Resources */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="label">Assign Safe *</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <select
                        className="input pl-9"
                        value={formData.safe_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            safe_id: (e.target as HTMLSelectElement).value,
                          })
                        }
                      >
                        <option value="">Select a safe unit...</option>
                        {availableSafes.map((safe) => (
                          <option key={safe.id} value={safe.id}>
                            {safe.serial_number} — {safe.status} (
                            {safe.battery_level}%)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Client Details */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-4 border-b border-gray-100 pb-2">
                    Client Details (Booker)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                      <label className="label">Client Name *</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Acme Jewelry"
                        value={formData.client_name}
                        onInput={(e) =>
                          setFormData({
                            ...formData,
                            client_name: (e.target as HTMLInputElement).value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="label">Client Phone</label>
                      <input
                        type="tel"
                        className="input"
                        placeholder="+27..."
                        value={formData.client_phone}
                        onInput={(e) =>
                          setFormData({
                            ...formData,
                            client_phone: (e.target as HTMLInputElement).value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label">
                        Client Email (for invoice/tracking)
                      </label>
                      <input
                        type="email"
                        className="input"
                        placeholder="accounts@acme.com"
                        value={formData.client_email}
                        onInput={(e) =>
                          setFormData({
                            ...formData,
                            client_email: (e.target as HTMLInputElement).value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Recipient / OTP Target */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Recipient & OTP Settings
                    </h4>
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.recipient_is_client}
                        onChange={(e) =>
                          toggleRecipient(
                            (e.target as HTMLInputElement).checked
                          )
                        }
                        className="text-brand focus:ring-brand rounded border-gray-300"
                      />
                      Recipient is same as Client
                    </label>
                  </div>

                  {!formData.recipient_is_client ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                      <div className="col-span-2 md:col-span-1">
                        <label className="label">Recipient Name *</label>
                        <input
                          type="text"
                          className="input bg-white"
                          placeholder="Receiver Name"
                          value={formData.recipient_name}
                          onInput={(e) =>
                            setFormData({
                              ...formData,
                              recipient_name: (e.target as HTMLInputElement)
                                .value,
                            })
                          }
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="label">
                          Recipient Phone (for SMS OTP)
                        </label>
                        <input
                          type="tel"
                          className="input bg-white"
                          placeholder="+27..."
                          value={formData.recipient_phone}
                          onInput={(e) =>
                            setFormData({
                              ...formData,
                              recipient_phone: (e.target as HTMLInputElement)
                                .value,
                            })
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="label">
                          Recipient Email (for Email OTP) *
                        </label>
                        <input
                          type="email"
                          className="input bg-white"
                          placeholder="receiver@email.com"
                          value={formData.recipient_email}
                          onInput={(e) =>
                            setFormData({
                              ...formData,
                              recipient_email: (e.target as HTMLInputElement)
                                .value,
                            })
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          The OTP required to unlock the safe will be sent here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      The secure OTP will be sent to the Client's contact
                      details entered above.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Locations & Site Contacts */}
            {currentStep === 2 && (
              <div className="space-y-8 animate-fade-in">
                {/* Pickup */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-brand font-medium">
                    <MapPin className="h-4 w-4" /> Pickup Details
                  </div>
                  <div className="space-y-4 pl-6 border-l-2 border-gray-100">
                    <div>
                      <label className="label">Pickup Address *</label>
                      <textarea
                        className="input min-h-[60px]"
                        placeholder="Full street address..."
                        value={formData.pickup_address}
                        onInput={(e) =>
                          setFormData({
                            ...formData,
                            pickup_address: (e.target as HTMLTextAreaElement)
                              .value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Site Contact Name</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Security Desk"
                          value={formData.pickup_contact_name}
                          onInput={(e) =>
                            setFormData({
                              ...formData,
                              pickup_contact_name: (
                                e.target as HTMLInputElement
                              ).value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">Site Contact Phone</label>
                        <input
                          type="tel"
                          className="input"
                          placeholder="Optional"
                          value={formData.pickup_contact_phone}
                          onInput={(e) =>
                            setFormData({
                              ...formData,
                              pickup_contact_phone: (
                                e.target as HTMLInputElement
                              ).value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-gray-900 font-medium">
                    <MapPin className="h-4 w-4" /> Delivery Details
                  </div>
                  <div className="space-y-4 pl-6 border-l-2 border-gray-100">
                    <div>
                      <label className="label">Delivery Address *</label>
                      <textarea
                        className="input min-h-[60px]"
                        placeholder="Full street address..."
                        value={formData.delivery_address}
                        onInput={(e) =>
                          setFormData({
                            ...formData,
                            delivery_address: (e.target as HTMLTextAreaElement)
                              .value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Site Contact Name</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Reception"
                          value={formData.delivery_contact_name}
                          onInput={(e) =>
                            setFormData({
                              ...formData,
                              delivery_contact_name: (
                                e.target as HTMLInputElement
                              ).value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="label">Site Contact Phone</label>
                        <input
                          type="tel"
                          className="input"
                          placeholder="Optional"
                          value={formData.delivery_contact_phone}
                          onInput={(e) =>
                            setFormData({
                              ...formData,
                              delivery_contact_phone: (
                                e.target as HTMLInputElement
                              ).value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-md border border-gray-100">
                  <input
                    type="checkbox"
                    id="sig"
                    checked={formData.requires_signature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requires_signature: (e.target as HTMLInputElement)
                          .checked,
                      })
                    }
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  <label htmlFor="sig" className="text-sm text-gray-700">
                    Require digital signature on driver device upon delivery
                  </label>
                </div>
              </div>
            )}

            {/* STEP 3: Schedule & Review */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Scheduled Pickup *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.scheduled_pickup}
                      onInput={(e) =>
                        setFormData({
                          ...formData,
                          scheduled_pickup: (e.target as HTMLInputElement)
                            .value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Scheduled Delivery *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.scheduled_delivery}
                      onInput={(e) =>
                        setFormData({
                          ...formData,
                          scheduled_delivery: (e.target as HTMLInputElement)
                            .value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="label">Priority Level</label>
                    <select
                      className="input"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: (e.target as HTMLSelectElement)
                            .value as any,
                        })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">URGENT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">
                    Special Instructions (Driver Visible)
                  </label>
                  <textarea
                    className="input"
                    placeholder="e.g. Use side entrance, verify ID..."
                    value={formData.special_instructions}
                    onInput={(e) =>
                      setFormData({
                        ...formData,
                        special_instructions: (e.target as HTMLTextAreaElement)
                          .value,
                      })
                    }
                  />
                </div>

                <div className="bg-brand/5 border border-brand/10 rounded-md p-4 text-sm">
                  <h4 className="font-medium text-brand mb-2">
                    OTP Delivery Summary
                  </h4>
                  <p className="text-gray-600">
                    The secure unlock code will be sent to: <br />
                    <span className="font-medium text-gray-900">
                      {formData.recipient_is_client
                        ? formData.client_name
                        : formData.recipient_name}
                    </span>{" "}
                    (
                    {formData.recipient_is_client
                      ? formData.client_email
                      : formData.recipient_email}
                    )
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
            {currentStep > 1 ? (
              <button
                onClick={() => setCurrentStep((c) => c - 1)}
                className="btn btn-secondary"
              >
                Back
              </button>
            ) : (
              <button onClick={onClose} className="btn btn-ghost">
                Cancel
              </button>
            )}

            <button
              onClick={() =>
                currentStep === 3 ? handleSubmit() : handleNext()
              }
              className="btn btn-primary min-w-[120px]"
              disabled={loading}
            >
              {loading ? (
                <LoadingSpinner size="small" className="text-white" />
              ) : (
                <>
                  {currentStep === 3 ? "Confirm Booking" : "Next Step"}
                  {currentStep !== 3 && <ArrowRight className="ml-2 h-4 w-4" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
