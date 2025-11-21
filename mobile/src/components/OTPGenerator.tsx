import { useState } from "preact/hooks";
import { MapPin, Send, AlertTriangle } from "lucide-preact";
import { LoadingSpinner } from "./LoadingSpinner";

interface OTPGeneratorProps {
  tripId: string;
  onOTPRequested: (expiresAt: string) => void;
  onError: (error: string) => void;
}

export function OTPGenerator({
  // tripId,
  onOTPRequested,
  onError,
}: OTPGeneratorProps) {
  const [requesting, setRequesting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<
    "unknown" | "checking" | "valid" | "invalid"
  >("unknown");

  const handleRequestOTP = async () => {
    setRequesting(true);
    setLocationStatus("checking");

    try {
      // Get current location (placeholder for now)
      /*       const location = {
        latitude: -33.9249,
        longitude: 18.4241,
        accuracy: 10,
      };
 */
      setLocationStatus("valid");

      // Simulate OTP request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success callback
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      onOTPRequested(expiresAt);
    } catch (error) {
      setLocationStatus("invalid");
      onError("Failed to request OTP. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
          <Send className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Request Delivery Code
        </h3>
        <p className="text-gray-600">Send unlock code to recipient via email</p>
      </div>

      {/* Location Status */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <MapPin className="h-5 w-5 text-gray-600" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Location Status</p>
            <div className="flex items-center space-x-2 mt-1">
              {locationStatus === "checking" && (
                <>
                  <LoadingSpinner size="small" />
                  <span className="text-sm text-gray-600">
                    Checking location...
                  </span>
                </>
              )}
              {locationStatus === "valid" && (
                <span className="text-sm text-green-600">
                  At delivery location
                </span>
              )}
              {locationStatus === "invalid" && (
                <span className="text-sm text-red-600">
                  Location verification failed
                </span>
              )}
              {locationStatus === "unknown" && (
                <span className="text-sm text-gray-600">
                  Location not checked
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Security Requirements
            </p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1">
              <li>• Must be at delivery location</li>
              <li>• Recipient will receive 6-digit code via email</li>
              <li>• Code expires in 10 minutes</li>
              <li>• Verify recipient identity before opening safe</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Request Button */}
      <button
        onClick={handleRequestOTP}
        disabled={requesting}
        className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {requesting ? (
          <div className="flex items-center justify-center space-x-2">
            <LoadingSpinner size="small" />
            <span>Requesting Code...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <Send className="h-5 w-5" />
            <span>Request Delivery Code</span>
          </div>
        )}
      </button>
    </div>
  );
}
