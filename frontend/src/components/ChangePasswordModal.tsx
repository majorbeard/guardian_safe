import { useState } from "preact/hooks";
import { Lock, Eye, EyeOff } from "lucide-preact";
import { authService } from "../services/auth";
import { LoadingSpinner } from "./LoadingSpinner";

export function ChangePasswordModal() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const result = await authService.changePassword(newPassword);

      if (!result.success) {
        setError(result.error || "Failed to change password");
      }
      // Success will update auth state and close modal
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-yellow-100 rounded-full p-2">
            <Lock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
            <p className="text-sm text-gray-600">
              You must change your password to continue
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700"
            >
              New Password
            </label>
            <div className="mt-1 relative">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                required
                className="input pr-10"
                placeholder="Enter new password"
                value={newPassword}
                onInput={(e) =>
                  setNewPassword((e.target as HTMLInputElement).value)
                }
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              className="mt-1 input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onInput={(e) =>
                setConfirmPassword((e.target as HTMLInputElement).value)
              }
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
            <p className="font-medium">Password requirements:</p>
            <ul className="mt-1 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• Should contain letters and numbers</li>
              <li>• Avoid common passwords</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary"
          >
            {loading ? (
              <>
                <LoadingSpinner size="small" className="mr-2" />
                Changing Password...
              </>
            ) : (
              "Change Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
