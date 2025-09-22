import { useState, useEffect } from "preact/hooks";
import {
  X,
  Shield,
  Smartphone,
  User,
  Eye,
  EyeOff,
  Copy,
  MapPin,
  AlertTriangle,
  RefreshCw,
} from "lucide-preact";
import { dataService } from "../services/data";
import { trackneticsService } from "../services/tracknetics";
import {
  mobileUserService,
  type MobileUserCredentials,
} from "../services/mobileUsers";
import { LoadingSpinner } from "./LoadingSpinner";
import { safes } from "../store/data";
import { supabase } from "../lib/supabase";

interface CreateSafeModalProps {
  onClose: () => void;
}

interface AdminUser {
  id: string;
  username: string;
}

interface TrackerDevice {
  id: string;
  sn: string; // IMEI
  name: string;
  status: string;
  isAvailable: boolean;
}

export function CreateSafeModal({ onClose }: CreateSafeModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    serial_number: "",
    device_hash: "",
    selected_tracker_id: "",
    assigned_to: "",
    driver_name: "",
  });

  // State management
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [availableTrackers, setAvailableTrackers] = useState<TrackerDevice[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTrackers, setLoadingTrackers] = useState(false);
  const [trackersError, setTrackersError] = useState("");
  const [error, setError] = useState("");

  // Credentials state
  const [mobileCredentials, setMobileCredentials] =
    useState<MobileUserCredentials | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("role", "admin")
        .eq("is_active", true)
        .order("username");

      if (error) {
        console.error("Failed to load admin users:", error);
      } else {
        setAdminUsers(data || []);
      }
    } catch (err) {
      console.error("Error loading admin users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load available trackers from Tracknetics
  const loadAvailableTrackers = async () => {
    setLoadingTrackers(true);
    setTrackersError("");

    try {
      console.log("🔍 Fetching available trackers from Tracknetics...");

      // Get all devices from Tracknetics account
      const result = await trackneticsService.getDeviceList();

      if (!result.success || !result.devices) {
        throw new Error(result.error || "Failed to fetch tracking devices");
      }

      console.log(
        `📱 Found ${result.devices.length} trackers in Tracknetics account`
      );

      // Get trackers already assigned to safes in our database
      const assignedTrackerIds = safes.value
        .map((safe) => safe.tracknetics_device_id || safe.tracking_device_id)
        .filter(Boolean);

      console.log(
        `🔒 ${assignedTrackerIds.length} trackers already assigned to safes`
      );

      // Filter to show only available trackers
      const availableDevices: TrackerDevice[] = result.devices.map(
        (device) => ({
          id: device.id,
          sn: device.sn,
          name: device.name,
          status: device.status,
          isAvailable: !assignedTrackerIds.includes(device.id),
        })
      );

      const unassignedCount = availableDevices.filter(
        (d) => d.isAvailable
      ).length;
      console.log(`✅ ${unassignedCount} trackers available for assignment`);

      setAvailableTrackers(availableDevices);

      if (unassignedCount === 0) {
        setTrackersError(
          "No available trackers found. All trackers are already assigned to safes."
        );
      }
    } catch (error: any) {
      console.error("❌ Error loading trackers:", error);

      if (
        error.message?.includes("Authentication failed") ||
        error.message?.includes("login") ||
        error.message?.includes("KEY incorrect")
      ) {
        setTrackersError(
          "Unable to connect to tracking service provider. Please contact Tracknetics support to ensure your account is active and service is online."
        );
      } else {
        setTrackersError(
          error.message ||
            "Failed to load tracking devices. Please check your connection and try again."
        );
      }
    } finally {
      setLoadingTrackers(false);
    }
  };

  const generateDeviceHash = () => {
    const chars = "ABCDEF0123456789";
    let hash = "";
    for (let i = 0; i < 16; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, device_hash: hash }));
  };

  const handleStep1Submit = (e: Event) => {
    e.preventDefault();
    if (!formData.serial_number || !formData.assigned_to) {
      setError("Please fill in all required fields");
      return;
    }
    setCurrentStep(2);
    setError("");
    // Load trackers when moving to step 2
    loadAvailableTrackers();
  };

  const handleStep2Submit = (e: Event) => {
    e.preventDefault();
    if (!formData.selected_tracker_id || !formData.device_hash) {
      setError("Please select a tracker and generate device hash");
      return;
    }
    setCurrentStep(3);
    setError("");
  };

  const handleFinalSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Create the safe
      const safeResult = await dataService.createSafe({
        serial_number: formData.serial_number,
        device_hash: formData.device_hash,
        tracking_device_id: formData.selected_tracker_id, // Store the selected tracker
        assigned_to: formData.assigned_to,
      });

      if (!safeResult.success) {
        setError(safeResult.error || "Failed to create safe");
        setLoading(false);
        return;
      }

      // Step 2: Create mobile app user
      const mobileUserResult = await mobileUserService.createMobileUser(
        safeResult.safe!.id,
        formData.serial_number,
        formData.driver_name
      );

      if (!mobileUserResult.success) {
        setError(
          `Safe created but failed to create mobile user: ${mobileUserResult.error}`
        );
        setLoading(false);
        return;
      }

      // Success! Show credentials
      setMobileCredentials(mobileUserResult.credentials!);
      setCurrentStep(4);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (mobileCredentials) {
      const credentialsText = `Guardian Safe Mobile App Login:
Username: ${mobileCredentials.username}
Password: ${mobileCredentials.password}
      
Please save these credentials securely. The password will not be shown again.`;

      navigator.clipboard.writeText(credentialsText);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData({
      serial_number: "",
      device_hash: "",
      selected_tracker_id: "",
      assigned_to: "",
      driver_name: "",
    });
    setAvailableTrackers([]);
    setMobileCredentials(null);
    setError("");
    setTrackersError("");
    onClose();
  };

  // Get selected tracker info
  const selectedTracker = availableTrackers.find(
    (t) => t.id === formData.selected_tracker_id
  );

  // Step 4: Show Credentials
  if (currentStep === 4 && mobileCredentials) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Safe Registered Successfully!
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-green-500 rounded-full p-1">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-medium text-green-800">
                  Registration Complete
                </h3>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>
                  <strong>Safe:</strong> {formData.serial_number}
                </p>
                <p>
                  <strong>Tracker:</strong>{" "}
                  {selectedTracker?.name || formData.selected_tracker_id}
                </p>
                <p>
                  <strong>Status:</strong> Inactive (ready for activation)
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-blue-800">
                    Mobile App Credentials
                  </h3>
                </div>
                <button
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {showCredentials ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {showCredentials ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      Username:
                    </p>
                    <p className="font-mono text-blue-900 bg-white px-2 py-1 rounded text-sm">
                      {mobileCredentials.username}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      Password:
                    </p>
                    <p className="font-mono text-blue-900 bg-white px-2 py-1 rounded text-sm">
                      {mobileCredentials.password}
                    </p>
                  </div>
                  <button
                    onClick={copyCredentials}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy Credentials</span>
                  </button>
                </div>
              ) : (
                <p className="text-sm text-blue-700">
                  Click the eye icon to view the mobile app login credentials.
                </p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Next Steps:</strong>
              </p>
              <ol className="text-sm text-yellow-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Test the safe and tracker functionality</li>
                <li>Activate the safe from the Safes dashboard</li>
                <li>Provide mobile credentials to your driver</li>
              </ol>
            </div>

            <button onClick={handleClose} className="w-full btn btn-primary">
              Complete Registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {currentStep === 1
              ? "Register New Safe"
              : currentStep === 2
              ? "Select Tracking Device"
              : "Configure Mobile Access"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 1
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            1
          </div>
          <div
            className={`h-1 w-8 ${
              currentStep >= 2 ? "bg-blue-600" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 2
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            2
          </div>
          <div
            className={`h-1 w-8 ${
              currentStep >= 3 ? "bg-blue-600" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= 3
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            3
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Basic Safe Info */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Safe Serial Number *
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  required
                  className="input pl-10"
                  placeholder="GS-2025-001"
                  value={formData.serial_number}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      serial_number: (
                        e.target as HTMLInputElement
                      ).value.toUpperCase(),
                    }))
                  }
                />
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Assign to Admin User *
              </label>
              <div className="mt-1">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-2">
                    <LoadingSpinner size="small" />
                    <span className="ml-2 text-sm text-gray-500">
                      Loading users...
                    </span>
                  </div>
                ) : (
                  <select
                    required
                    className="input"
                    value={formData.assigned_to}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        assigned_to: (e.target as HTMLSelectElement).value,
                      }))
                    }
                  >
                    <option value="">Select an admin user</option>
                    {adminUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Tracker Selection */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select GPS Tracker *
                </label>
                <button
                  type="button"
                  onClick={loadAvailableTrackers}
                  disabled={loadingTrackers}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      loadingTrackers ? "animate-spin" : ""
                    }`}
                  />
                  <span>Refresh List</span>
                </button>
              </div>

              {loadingTrackers ? (
                <div className="flex items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <LoadingSpinner size="medium" />
                    <p className="mt-2 text-sm text-gray-500">
                      Fetching available trackers from Tracknetics...
                    </p>
                  </div>
                </div>
              ) : trackersError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800 mb-2">
                        Unable to Load Trackers
                      </p>
                      <p className="text-sm text-red-700 mb-3">
                        {trackersError}
                      </p>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={loadAvailableTrackers}
                          className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <select
                    required
                    className="input"
                    value={formData.selected_tracker_id}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        selected_tracker_id: (e.target as HTMLSelectElement)
                          .value,
                      }))
                    }
                  >
                    <option value="">Select a tracking device</option>
                    {availableTrackers
                      .filter((tracker) => tracker.isAvailable)
                      .map((tracker) => (
                        <option key={tracker.id} value={tracker.id}>
                          {tracker.name} (ID: {tracker.id}) - {tracker.status}
                        </option>
                      ))}
                  </select>

                  {/* Tracker Info */}
                  {selectedTracker && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <h4 className="font-medium text-blue-800">
                          Selected Tracker
                        </h4>
                      </div>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>
                          <strong>Device:</strong> {selectedTracker.name}
                        </p>
                        <p>
                          <strong>ID:</strong> {selectedTracker.id}
                        </p>
                        <p>
                          <strong>IMEI:</strong> {selectedTracker.sn}
                        </p>
                        <p>
                          <strong>Status:</strong> {selectedTracker.status}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  <div className="mt-3 text-xs text-gray-500 text-center">
                    {availableTrackers.filter((t) => t.isAvailable).length}{" "}
                    available •{" "}
                    {availableTrackers.filter((t) => !t.isAvailable).length}{" "}
                    already assigned • {availableTrackers.length} total in
                    account
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Device Hash (Phone + Pi Combo) *
              </label>
              <div className="mt-1 flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    required
                    className="input pl-10 font-mono"
                    placeholder="Generated device hash"
                    value={formData.device_hash}
                    onInput={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        device_hash: (
                          e.target as HTMLInputElement
                        ).value.toUpperCase(),
                      }))
                    }
                  />
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <button
                  type="button"
                  onClick={generateDeviceHash}
                  className="btn btn-secondary"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
              <p className="font-medium">✅ Tracker Assignment Validated</p>
              <p className="mt-1">
                The selected tracker is confirmed available and will be assigned
                to this safe.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  !formData.selected_tracker_id ||
                  !formData.device_hash ||
                  !!trackersError
                }
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Mobile User Setup */}
        {currentStep === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Driver Name (Optional)
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="John Doe"
                  value={formData.driver_name}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      driver_name: (e.target as HTMLInputElement).value,
                    }))
                  }
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This will be used for the mobile app account
              </p>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">
                Registration Summary
              </h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Safe Serial:</span>
                  <span className="font-mono">{formData.serial_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GPS Tracker:</span>
                  <span className="font-mono">
                    {selectedTracker?.name || formData.selected_tracker_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Device Hash:</span>
                  <span className="font-mono text-xs">
                    {formData.device_hash}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Driver:</span>
                  <span>{formData.driver_name || "Auto-generated"}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
              <p className="font-medium">What will be created:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Safe registration with validated GPS tracker</li>
                <li>Mobile app user account for driver access</li>
                <li>Secure login credentials for the safe's phone</li>
                <li>Safe will be created as INACTIVE (ready for testing)</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" className="mr-2" />
                    Creating Safe...
                  </>
                ) : (
                  "Create Safe & Mobile User"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
