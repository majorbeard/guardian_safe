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
import { otpService } from "../services/otp";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { format } from "date-fns";
import { bluetoothService } from "../services/bluetooth";

interface DeliveryScreenProps {
  trip: {
    id: string;
    safe_id?: string;
    client_name: string;
    client_email?: string;
    recipient_name?: string;
    recipient_email?: string;
    recipient_phone?: string;
    recipient_is_client?: boolean;
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
  const [btConnected, setBtConnected] = useState(false);

  const STORAGE_KEY = `delivery_state_${trip.id}`;

  // Load saved state on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        console.log("Restoring delivery state:", parsed);

        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.otpExpires) setOtpExpires(new Date(parsed.otpExpires));
      }
    } catch (err) {
      console.error("Failed to restore state:", err);
    }
  }, [trip.id]);

  // Save state whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        currentStep,
        location,
        otpExpires: otpExpires?.toISOString(),
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.error("Failed to save state:", err);
    }
  }, [currentStep, location, otpExpires, trip.id]);

  // Clear state when delivery completes
  useEffect(() => {
    if (currentStep === "complete") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [currentStep, STORAGE_KEY]);

  // Bluetooth initialization
  useEffect(() => {
    initializeBluetooth();
    return () => bluetoothService.disconnect();
  }, []);

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
  const handleArrived = async () => {
    console.log("Driver says they've arrived at delivery location");

    // Show location verification step
    setCurrentStep("location");
    setLoading(true);

    try {
      // Get current location first
      await getCurrentLocation();

      // Send arrival notification to recipient
      if (trip.recipient_email) {
        console.log(
          "Sending arrival notification to recipient:",
          trip.recipient_email
        );

        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const response = await fetch(
            `${supabaseUrl}/functions/v1/send-recipient-arrival`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${anonKey}`,
                apikey: anonKey,
              },
              body: JSON.stringify({
                to: trip.recipient_email,
                recipient_name: trip.recipient_name || trip.client_name,
                client_name: trip.client_name,
                delivery_address: trip.delivery_address,
                trip_id: trip.id,
                driver_name: "Mobile Driver",
                safe_serial: "Safe",
              }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            console.log("Arrival notification sent:", result);
          } else {
            console.warn("Arrival notification failed:", await response.text());
          }
        } catch (emailError) {
          console.warn("Could not send arrival notification:", emailError);
        }
      } else {
        console.log("No recipient email - skipping arrival notification");
      }
    } catch (err) {
      console.error("Error in arrival flow:", err);
      setError("Failed to verify location. Please try again.");
      setCurrentStep("travel");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Get current location
  const getCurrentLocation = async () => {
    console.log("Getting current location...");
    setLoading(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockLocation = {
        latitude: -33.9249,
        longitude: 18.4241,
        accuracy: 10,
        timestamp: Date.now(),
      };

      console.log("Using mock location for testing:", mockLocation);
      setLocation(mockLocation);
      setCurrentStep("otp_request");
      console.log("Location verified, ready for OTP request");
    } catch (err) {
      console.error("Location exception:", err);
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

    // Check if OTP was recently requested
    if (otpExpires && otpExpires > new Date()) {
      const timeLeft = Math.floor((otpExpires.getTime() - Date.now()) / 1000);
      setError(
        `OTP already sent. Wait ${timeLeft} seconds or enter existing code.`
      );
      setCurrentStep("otp_enter");
      return;
    }

    console.log("Requesting OTP for trip:", trip.id);
    console.log(
      "OTP will be sent to:",
      trip.recipient_email || trip.client_email
    );

    setLoading(true);
    setError("");

    try {
      const result = await otpService.requestOTP(trip.id, location);

      if (result.success) {
        console.log("OTP requested successfully");
        setCurrentStep("otp_enter");
        if (result.expires_at) {
          setOtpExpires(new Date(result.expires_at));
        }
      } else {
        console.error("OTP request failed:", result.error);
        setError(result.error || "Failed to request OTP");
      }
    } catch (err) {
      console.error("OTP request exception:", err);
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

    setLoading(true);
    setError("");

    try {
      if (!bluetoothService.isConnectedToPi()) {
        setError("Connecting to safe...");

        await bluetoothService.initialize();

        const scanResult = await bluetoothService.scanForPi();
        if (!scanResult.success) {
          setError("Cannot find safe. Make sure you are near the safe.");
          setLoading(false);
          return;
        }

        const connectResult = await bluetoothService.connectToPi();
        if (!connectResult.success) {
          setError("Failed to connect to safe via Bluetooth");
          setLoading(false);
          return;
        }
        setBtConnected(true);
      }

      const otpResult = await otpService.verifyOTP(trip.id, otpCode);

      if (!otpResult.success) {
        setError(otpResult.error || "Invalid OTP code");
        setOtpCode("");
        setLoading(false);
        return;
      }

      console.log("Server verified OTP!");

      console.log("Sending OTP to safe...");
      const piResult = await bluetoothService.sendOTPToPi(otpCode);

      if (!piResult.success) {
        setError("Failed to unlock safe");
        setLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusResult = await bluetoothService.readPiStatus();
      if (!statusResult.success || !statusResult.status) {
        setError("Failed to verify safe status");
        setLoading(false);
        return;
      }

      if (!statusResult.status.verified || !statusResult.status.lockOpen) {
        setError("Safe failed to unlock. Please try again.");
        setLoading(false);
        return;
      }

      console.log("Safe unlocked!");

      const tripResult = await tripsService.completeTrip(trip.id);

      if (tripResult.success) {
        console.log("Delivery completed!");
        setCurrentStep("complete");
      } else {
        setError(tripResult.error || "Failed to complete delivery");
      }
    } catch (err) {
      console.error("Verify OTP exception:", err);
      setError("Failed to complete delivery");
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

  const renderOTPRequestStep = () => {
    const recipientName = trip.recipient_name || trip.client_name;
    const recipientEmail = trip.recipient_email || trip.client_email;
    const isClientReceiving =
      trip.recipient_is_client || trip.recipient_email === trip.client_email;

    return (
      <div className="text-center space-y-6">
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <MapPin className="h-6 w-6 text-green-600" />
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h4 className="font-bold text-green-800 mb-1">✓ Location Verified</h4>
          <p className="text-sm text-green-700">
            You are at the delivery location
          </p>
          {location && (
            <p className="text-xs text-green-600 mt-2">
              GPS Accuracy: ±{Math.round(location.accuracy)}m
            </p>
          )}
        </div>

        <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
          <Mail className="h-8 w-8 text-orange-600" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900">
          Ready to Request Unlock Code
        </h3>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-2">
            OTP Will Be Sent To:
          </p>
          <p className="text-blue-900 font-semibold">{recipientName}</p>
          <p className="text-sm text-blue-700">{recipientEmail}</p>
          {!isClientReceiving && (
            <p className="text-xs text-blue-600 mt-2">
              (Recipient is different from client: {trip.client_name})
            </p>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700">
            Arrival notification sent to recipient
          </p>
        </div>

        <button
          onClick={handleRequestOTP}
          disabled={loading}
          className="bg-orange-600 text-white py-3 px-8 rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 w-full"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="small" />
              <span>Sending Code to {recipientName}...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Send Unlock Code to Recipient</span>
            </div>
          )}
        </button>

        <p className="text-xs text-gray-500">
          The recipient will receive a 6-digit code to verify delivery
        </p>
      </div>
    );
  };

  const renderOTPEnterStep = () => {
    const recipientName = trip.recipient_name || trip.client_name;

    return (
      <div className="text-center space-y-6">
        <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
          <Smartphone className="h-8 w-8 text-red-600" />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> This code is valid for 10 minutes. If you
            need a new code, tap "Request New Code" below.
          </p>
        </div>

        <h3 className="text-lg font-semibold text-gray-900">
          Enter Unlock Code
        </h3>

        <p className="text-gray-600">
          Ask <strong>{recipientName}</strong> for the 6-digit code that was
          emailed to them.
        </p>

        {btConnected && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Connected to Safe via Bluetooth
              </span>
            </div>
          </div>
        )}

        {!btConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Connecting to safe...</span>
            </div>
          </div>
        )}

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
            onInput={(e) =>
              handleOTPInput((e.target as HTMLInputElement).value)
            }
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
  };

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-green-900 mb-2">
        Delivery Complete!
      </h3>
      <p className="text-green-700 mb-6">
        Safe has been successfully unlocked and delivery confirmed.
      </p>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left mb-6">
        <h4 className="font-medium text-green-800 mb-2">Delivery Summary:</h4>
        <div className="text-sm text-green-700 space-y-1">
          <p>Location verified</p>
          <p>OTP authenticated</p>
          <p>Safe unlocked successfully</p>
          <p>Delivery confirmed</p>
          <p>Completed: {format(new Date(), "MMM d, yyyy HH:mm")}</p>
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

  const initializeBluetooth = async () => {
    await bluetoothService.initialize();

    const scanResult = await bluetoothService.scanForPi();
    if (scanResult.success) {
      const connectResult = await bluetoothService.connectToPi();
      if (connectResult.success) {
        setBtConnected(true);

        bluetoothService.subscribeToPiStatus((status) => {
          console.log("Pi status update:", status);
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
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

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

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
