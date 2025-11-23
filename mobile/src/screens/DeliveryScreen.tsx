import { useState, useEffect } from "preact/hooks";
import {
  ArrowLeft,
  Navigation,
  Key,
  CheckCircle,
  AlertCircle,
  Mail,
  // Package,
} from "lucide-preact";
import { tripsService } from "../services/trips";
import { otpService } from "../services/otp";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { bluetoothService } from "../services/bluetooth";
import { geolocationService } from "../services/geolocation";

interface DeliveryScreenProps {
  trip: any;
  onBack: () => void;
}

export function DeliveryScreen({ trip, onBack }: DeliveryScreenProps) {
  const [step, setStep] = useState<
    "travel" | "otp_req" | "otp_enter" | "unlocking" | "summary" | "success"
  >("travel");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(`trip_state_${trip.id}`);
    if (saved) setStep(saved as any);
  }, [trip.id]);

  useEffect(() => {
    if (step === "success") localStorage.removeItem(`trip_state_${trip.id}`);
    else localStorage.setItem(`trip_state_${trip.id}`, step);
  }, [step, trip.id]);

  const handleArrived = async () => {
    setLoading(true);
    setError("");
    try {
      const locResult = await geolocationService.getCurrentPosition();
      if (!locResult.success) throw new Error(locResult.error);

      const updateResult = await tripsService.updateTripStatus(
        trip.id,
        "at_location"
      );
      if (!updateResult.success) throw new Error(updateResult.error);

      setStep("otp_req");
    } catch (err: any) {
      setError(err.message || "Failed to verify location.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    setError("");
    try {
      const locResult = await geolocationService.getCurrentPosition();
      if (!locResult.success || !locResult.location)
        throw new Error("Location required for OTP.");

      const result = await otpService.requestOTP(trip.id, locResult.location);
      if (result.success) {
        setStep("otp_enter");
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message || "OTP Request failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (otpCode.length !== 6) return setError("Enter 6-digit code.");

    setLoading(true);
    setError("");

    try {
      const verifyResult = await otpService.verifyOTP(trip.id, otpCode);
      if (!verifyResult.success) throw new Error(verifyResult.error);

      if (!bluetoothService.isConnectedToPi()) {
        await bluetoothService.initialize();
        const scan = await bluetoothService.scanForPi();
        if (!scan.success) throw new Error("Safe not found. Move closer.");
        const conn = await bluetoothService.connectToPi();
        if (!conn.success) throw new Error("Bluetooth connection failed.");
      }

      setStep("unlocking");
      const btResult = await bluetoothService.sendOTPToPi(otpCode);
      if (!btResult.success) throw new Error(btResult.error);

      const completeResult = await tripsService.completeTrip(trip.id);
      if (!completeResult.success) throw new Error(completeResult.error);

      setStep("summary");
    } catch (err: any) {
      setError(err.message || "Unlock process failed.");
      setStep("otp_enter");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (deliveryNotes.trim()) {
      await tripsService.addDeliveryNotes(trip.id, deliveryNotes);
    }
    setStep("success");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col pb-safe">
      <div className="px-4 py-4 pt-5 border-b border-gray-100 flex items-center bg-white sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-500 hover:bg-gray-50 rounded-full"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="font-semibold text-gray-900 text-lg">Delivery</h1>
          <p className="text-xs text-gray-500 truncate w-48">
            {trip.delivery_address}
          </p>
        </div>
        <div className="ml-auto">
          <span className="bg-brand/10 text-brand text-xs font-bold px-2 py-1 rounded uppercase">
            {step === "success" ? "Done" : "Active"}
          </span>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {step === "travel" && (
          <div className="w-full max-w-sm">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Navigation className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">En Route</h2>
            <p className="text-gray-500 mb-8">
              Navigate to the delivery location. Confirm arrival to proceed.
            </p>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8 text-left">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                Destination
              </p>
              <p className="text-gray-900 font-medium">
                {trip.delivery_address}
              </p>
              {trip.delivery_contact_name && (
                <p className="text-sm text-gray-500 mt-1">
                  {trip.delivery_contact_name}
                </p>
              )}
            </div>

            <button
              onClick={handleArrived}
              disabled={loading}
              className="w-full btn btn-primary py-4 text-lg rounded-xl shadow-lg shadow-brand/20"
            >
              {loading ? (
                <LoadingSpinner className="text-white" />
              ) : (
                "I have Arrived"
              )}
            </button>
          </div>
        )}

        {step === "otp_req" && (
          <div className="w-full max-w-sm">
            <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Mail className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Authorize Unlock
            </h2>
            <p className="text-gray-500 mb-8">
              Send the secure 6-digit code to the recipient to confirm identity.
            </p>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8 text-left">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                Recipient
              </p>
              <p className="text-gray-900 font-medium text-lg">
                {trip.recipient_name || trip.client_name}
              </p>
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                <Mail className="h-3 w-3" />
                {trip.recipient_email || trip.client_email}
              </p>
            </div>

            <button
              onClick={handleRequestOTP}
              disabled={loading}
              className="w-full btn btn-primary py-4 text-lg rounded-xl shadow-lg shadow-brand/20"
            >
              {loading ? (
                <LoadingSpinner className="text-white" />
              ) : (
                "Send OTP Code"
              )}
            </button>
          </div>
        )}

        {step === "otp_enter" && (
          <div className="w-full max-w-sm">
            <div className="w-20 h-20 bg-gray-900 text-brand rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Key className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Enter Code
            </h2>
            <p className="text-gray-500 mb-8">
              Ask the recipient for the 6-digit PIN sent to their email.
            </p>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="w-full text-center text-5xl tracking-[0.2em] font-mono border-b-2 border-gray-200 focus:border-brand outline-none py-4 mb-8 bg-transparent transition-colors"
              placeholder="••••••"
              value={otpCode}
              onInput={(e) => setOtpCode((e.target as HTMLInputElement).value)}
              autoFocus
            />

            <button
              onClick={handleUnlock}
              disabled={otpCode.length !== 6 || loading}
              className="w-full btn btn-primary py-4 text-lg rounded-xl shadow-lg shadow-brand/20"
            >
              {loading ? (
                <LoadingSpinner className="text-white" />
              ) : (
                "Verify & Unlock"
              )}
            </button>

            <button
              onClick={() => setStep("otp_req")}
              className="mt-4 text-sm text-gray-400 underline"
            >
              Resend Code
            </button>
          </div>
        )}

        {step === "unlocking" && (
          <div className="w-full max-w-sm text-center">
            <LoadingSpinner size="large" className="mx-auto mb-6 text-brand" />
            <h2 className="text-xl font-bold text-gray-900">
              Unlocking Safe...
            </h2>
            <p className="text-gray-500 mt-2">Communicating via Bluetooth</p>
          </div>
        )}

        {step === "summary" && (
          <div className="w-full max-w-sm">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Delivery Confirmation
            </h2>
            <p className="text-gray-500 mb-8">
              Review delivery details before finalizing
            </p>

            <div className="space-y-4 mb-8 text-left">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                  Delivery Summary
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Client:</span>
                    <span className="font-medium text-gray-900">
                      {trip.client_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Recipient:</span>
                    <span className="font-medium text-gray-900">
                      {trip.recipient_name || trip.client_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Time:</span>
                    <span className="font-medium text-gray-900">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Any issues, observations, or comments..."
                  value={deliveryNotes}
                  onInput={(e) =>
                    setDeliveryNotes((e.target as HTMLTextAreaElement).value)
                  }
                />
              </div>
            </div>

            <button
              onClick={handleConfirmDelivery}
              className="w-full btn btn-primary py-4 text-lg rounded-xl shadow-lg shadow-brand/20"
            >
              Confirm Delivery
            </button>
          </div>
        )}

        {step === "success" && (
          <div className="w-full max-w-sm">
            <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Delivery Done
            </h2>
            <p className="text-gray-600 mb-8">Safe unlocked. Job closed.</p>

            <button
              onClick={onBack}
              className="w-full btn btn-secondary py-4 text-lg rounded-xl border-gray-300"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
