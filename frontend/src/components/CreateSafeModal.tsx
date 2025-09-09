import { useState, useEffect } from "preact/hooks";
import { X, Shield, Smartphone, Hash } from "lucide-preact";
import { dataService } from "../services/data";
import { LoadingSpinner } from "./LoadingSpinner";
import { supabase } from "../lib/supabase";

interface CreateSafeModalProps {
  onClose: () => void;
}

interface AdminUser {
  id: string;
  username: string;
}

export function CreateSafeModal({ onClose }: CreateSafeModalProps) {
  const [formData, setFormData] = useState({
    serial_number: "",
    device_hash: "",
    tracking_device_id: "",
    assigned_to: "",
  });
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles") // Changed from "users"
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

  const generateDeviceHash = () => {
    const chars = "ABCDEF0123456789";
    let hash = "";
    for (let i = 0; i < 16; i++) {
      hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, device_hash: hash }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await dataService.createSafe(formData);

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Failed to create safe");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Register New Safe</h2>
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

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Safe Serial Number *
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                required
                className="input pl-10"
                placeholder="GS-2024-001"
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

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tracking Device ID
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                className="input pl-10"
                placeholder="TR-ABC123 (optional)"
                value={formData.tracking_device_id}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    tracking_device_id: (e.target as HTMLInputElement).value,
                  }))
                }
              />
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
            <p className="font-medium">Important:</p>
            <ul className="mt-1 space-y-1">
              <li>
                • The device hash uniquely identifies the phone+Pi combination
              </li>
              <li>• Serial number should match the physical safe label</li>
              <li>• Tracking device ID is for GPS tracking integration</li>
            </ul>
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
              disabled={loading || loadingUsers}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  Registering...
                </>
              ) : (
                "Register Safe"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
