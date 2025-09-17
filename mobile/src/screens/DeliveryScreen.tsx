import { useState, useEffect } from "preact/hooks";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Mail,
  Smartphone,
} from "lucide-preact";
import { tripsService } from "../services/trips";
import { geolocationService } from "../services/geolocation";
import { otpService } from "../services/otp";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { format } from "date-fns";

interface DeliveryScreenProps {
  trip: {
    id: string;
    client_name: string;
    client_email?: string;
    pickup_address: string;
    delivery_address: string;
    status: string;
    scheduled_pickup: string;
    scheduled_delivery: string;
    special_instructions?: string;
    priority?: string;
    requires_signature?: boolean;
  };
  onBack: () => void;
}

export function DeliveryScreen({ trip, onBack }: DeliveryScreenProps) {
  // State management
  const [currentStep, setCurrentStep] = useState<
    "travel" | "location" | "otp_request" | "otp_enter" | "complete"
  >("travel");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpExpires, setOtpExpires] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Timer for OTP expiration
  useEffect(() => {
    if (otpExpires) {
      const timer = setInterval(() => {
        const remaining = Math.max(0, otpExpires.getTime() - Date.now());
        setTimeRemaining(remaining);

        if (remaining === 0) {
          setCurrentStep("otp_request");
          setOtpExpires(null);
          setError("OTP expired. Please request a new code.");
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [otpExpires]);

  // Step 1: Driver says they've arrived
  const handleArrived = () => {
    console.log("🚗 Driver says they've arrived");
    setCurrentStep("location");
    getCurrentLocation();
  };

  // Step 2: Get current location
  // Step 2: Get current location (MOCK VERSION FOR TESTING)
  const getCurrentLocation = async () => {
    console.log("📍 Getting current location...");
    setLoading(true);
    setError("");

    try {
      // Simulate loading delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // FOR TESTING: Use mock Cape Town coordinates
      const mockLocation = {
        latitude: -33.9249, // Cape Town
        longitude: 18.4241,
        accuracy: 10, // 10 meter accuracy
        timestamp: Date.now(),
      };

      console.log("🧪 Using mock location for testing:", mockLocation);
      setLocation(mockLocation);
      setCurrentStep("otp_request");

      // TODO: Replace with real location when testing on HTTPS:
      /*
    const result = await geolocationService.getCurrentPosition()
    
    if (result.success && result.location) {
      console.log("✅ Location obtained:", result.location)
      setLocation(result.location)
      setCurrentStep('otp_request')
    } else {
      console.error("❌ Location failed:", result.error)
      setError(result.error || 'Failed to get location')
      setCurrentStep('travel')
    }
    */
    } catch (err) {
      console.error("❌ Location exception:", err);
      setError("Location access required for delivery");
      setCurrentStep("travel");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Request OTP via email
  const handleRequestOTP = async () => {
    if (!location) {
      setError("Location required to request OTP");
      return;
    }

    console.log("📧 Requesting OTP for trip:", trip.id);
    setLoading(true);
    setError("");

    try {
      const result = await otpService.requestOTP(trip.id, location);

      if (result.success) {
        console.log("✅ OTP requested successfully");
        setCurrentStep("otp_enter");
        if (result.expires_at) {
          setOtpExpires(new Date(result.expires_at));
        }
      } else {
        console.error("❌ OTP request failed:", result.error);
        setError(result.error || "Failed to request OTP");
      }
    } catch (err) {
      console.error("❌ OTP request exception:", err);
      setError("Failed to request OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Verify OTP and complete delivery
  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    console.log("🔐 Verifying OTP:", otpCode);
    setLoading(true);
    setError("");

    try {
      // First verify the OTP
      const otpResult = await otpService.verifyOTP(trip.id, otpCode);

      if (!otpResult.success) {
        console.error("❌ OTP verification failed:", otpResult.error);
        setError(otpResult.error || "Invalid OTP code");
        setOtpCode("");
        setLoading(false);
        return;
      }

      console.log("✅ OTP verified! Now completing delivery...");

      // Then complete the trip
      const tripResult = await tripsService.completeTrip(trip.id);

      if (tripResult.success) {
        console.log("🎉 Delivery completed successfully!");
        setCurrentStep("complete");
      } else {
        console.error("❌ Trip completion failed:", tripResult.error);
        setError(tripResult.error || "Failed to complete delivery");
      }
    } catch (err) {
      console.error("❌ Verify OTP exception:", err);
      setError("Failed to verify OTP and complete delivery");
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleOTPInput = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 6);
    setOtpCode(cleanValue);
    setError("");
  };

  // Render functions for each step
  const renderTravelStep = () => (
    <div className="text-center space-y-6">
      <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
        <MapPin className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">
        En Route to Delivery
      </h3>
      <p className="text-gray-600">
        Proceed to the delivery location. When you arrive, tap the button below.
      </p>
      <button
        onClick={handleArrived}
        className="bg-blue-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        I've Arrived at Delivery Location
      </button>
    </div>
  );

  const renderLocationStep = () => (
    <div className="text-center space-y-4">
      <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
        <MapPin className="h-8 w-8 text-green-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">
        Verifying Location
      </h3>
      <p className="text-gray-600">Getting your GPS coordinates...</p>
      <div className="flex items-center justify-center space-x-2">
        <LoadingSpinner size="small" />
        <span className="text-gray-600">Please wait...</span>
      </div>
    </div>
  );

  const renderOTPRequestStep = () => (
    <div className="text-center space-y-6">
      <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
        <Mail className="h-8 w-8 text-orange-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">
        Ready to Request Unlock Code
      </h3>
      <p className="text-gray-600">
        Location verified! Click below to send the unlock code to the recipient.
      </p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
        <p className="text-sm font-medium text-yellow-800 mb-2">
          What happens next:
        </p>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 6-digit code will be emailed to {trip.client_name}</li>
          <li>• Code expires in 10 minutes</li>
          <li>• Recipient will provide code to you verbally</li>
        </ul>
      </div>

      <button
        onClick={handleRequestOTP}
        disabled={loading}
        className="bg-orange-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <div className="flex items-center justify-center space-x-2">
            <LoadingSpinner size="small" />
            <span>Sending...</span>
          </div>
        ) : (
          "Request Unlock Code"
        )}
      </button>
    </div>
  );

  const renderOTPEnterStep = () => (
    <div className="text-center space-y-6">
      <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
        <Smartphone className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Enter Unlock Code</h3>
      <p className="text-gray-600">
        Ask {trip.client_name} for the 6-digit code that was emailed to them.
      </p>

      {timeRemaining > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-center space-x-2 text-red-700">
            <Clock className="h-5 w-5" />
            <span className="font-medium">
              Code expires in: {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          className="w-full text-center text-3xl font-mono tracking-widest py-4 px-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          placeholder="000000"
          value={otpCode}
          onInput={(e) => handleOTPInput((e.target as HTMLInputElement).value)}
          autoFocus
        />

        <div className="flex space-x-3">
          <button
            onClick={() => setCurrentStep("otp_request")}
            className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Request New Code
          </button>
          <button
            onClick={handleVerifyOTP}
            disabled={loading || otpCode.length !== 6}
            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <LoadingSpinner size="small" />
                <span>Verifying...</span>
              </div>
            ) : (
              "Unlock Safe"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-green-900 mb-2">
        Delivery Complete! 🎉
      </h3>
      <p className="text-green-700 mb-6">
        Safe has been successfully unlocked and delivery confirmed.
      </p>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left mb-6">
        <h4 className="font-medium text-green-800 mb-2">Delivery Summary:</h4>
        <div className="text-sm text-green-700 space-y-1">
          <p>✅ Location verified</p>
          <p>✅ OTP authenticated</p>
          <p>✅ Safe unlocked successfully</p>
          <p>✅ Delivery confirmed</p>
          <p>🕐 Completed: {format(new Date(), "MMM d, yyyy HH:mm")}</p>
        </div>
      </div>

      <button
        onClick={onBack}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
      >
        Return to Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Secure Delivery
              </h1>
              <p className="text-sm text-gray-500">
                {trip.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Info */}
      <div className="bg-white border-b">
        <div className="px-4 py-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-blue-100 rounded-full p-2">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                {trip.client_name}
              </h2>
              {trip.client_email && (
                <p className="text-sm text-gray-500">{trip.client_email}</p>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Delivery Address</p>
              <p className="text-gray-600">{trip.delivery_address}</p>
            </div>
          </div>

          {trip.special_instructions && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm font-medium text-yellow-800 mb-1">
                Security Instructions:
              </p>
              <p className="text-sm text-yellow-700">
                {trip.special_instructions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          {currentStep === "travel" && renderTravelStep()}
          {currentStep === "location" && renderLocationStep()}
          {currentStep === "otp_request" && renderOTPRequestStep()}
          {currentStep === "otp_enter" && renderOTPEnterStep()}
          {currentStep === "complete" && renderCompleteStep()}
        </div>
      </div>
    </div>
  );
}
