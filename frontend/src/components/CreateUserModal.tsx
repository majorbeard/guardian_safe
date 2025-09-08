import { useState } from "preact/hooks";
import { X, User, Mail, Key } from "lucide-preact";
import { authService } from "../services/auth";
import { currentUser } from "../store/auth";
import { LoadingSpinner } from "./LoadingSpinner";

interface CreateUserModalProps {
  onClose: () => void;
}

export function CreateUserModal({ onClose }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    role: "admin" as "admin",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  const user = currentUser.value;

  const generatePassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authService.createUser({
        ...formData,
        created_by: user?.id,
      });

      if (result.success && result.user) {
        setCreatedUser(result.user);
        setShowCredentials(true);
      } else {
        setError(result.error || "Failed to create user");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (showCredentials && createdUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              User Created Successfully
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
                  <User className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-medium text-green-800">Account Details</h3>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">Email:</span>
                  <span className="font-mono text-green-900">
                    {formData.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Username:</span>
                  <span className="font-mono text-green-900">
                    {formData.username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Password:</span>
                  <span className="font-mono text-green-900">
                    {formData.password}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Share these credentials securely
                with the user. They will be required to change their password on
                first login.
              </p>
            </div>

            <button onClick={handleClose} className="w-full btn btn-primary">
              Done
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
          <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
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
              Email Address *
            </label>
            <div className="mt-1 relative">
              <input
                type="email"
                required
                className="input pl-10"
                placeholder="user@example.com"
                value={formData.email}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    email: (e.target as HTMLInputElement).value,
                  }))
                }
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username *
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                required
                className="input pl-10"
                placeholder="Enter username"
                value={formData.username}
                onInput={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    username: (e.target as HTMLInputElement).value,
                  }))
                }
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Temporary Password *
            </label>
            <div className="mt-1 flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  required
                  className="input pl-10"
                  placeholder="Generated password"
                  value={formData.password}
                  onInput={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: (e.target as HTMLInputElement).value,
                    }))
                  }
                />
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <button
                type="button"
                onClick={generatePassword}
                className="btn btn-secondary"
              >
                Generate
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
            <p className="font-medium">Note:</p>
            <p>
              The user will be required to change their password on first login.
            </p>
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
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
