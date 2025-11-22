import { MapPin, Send } from "lucide-preact";
import { LoadingSpinner } from "./LoadingSpinner";

interface OTPGeneratorProps {
  onOTPRequested: () => void;
  loading: boolean;
}

export function OTPGenerator({ onOTPRequested, loading }: OTPGeneratorProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
      <div className="bg-orange-50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
        <Send className="h-8 w-8 text-brand" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Request Delivery Code
      </h3>
      <p className="text-gray-500 text-sm mb-6">
        Confirm your location to send the unlock code to the recipient.
      </p>

      <button
        onClick={onOTPRequested}
        disabled={loading}
        className="w-full btn btn-primary py-3 rounded-lg flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <LoadingSpinner size="small" className="text-white" />
            <span>Verifying Location...</span>
          </>
        ) : (
          <>
            <MapPin className="h-4 w-4" />
            <span>Verify & Send Code</span>
          </>
        )}
      </button>
    </div>
  );
}
