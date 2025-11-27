import { useState } from "preact/hooks";
import { X, UserPlus, Lock } from "lucide-preact";
import { authService } from "../services/auth";
import { currentUser } from "../store/auth";
import { LoadingSpinner } from "./LoadingSpinner";

interface CreateUserModalProps {
  onClose: () => void;
  onUserCreated?: () => void;
}

export function CreateUserModal({
  onClose,
  onUserCreated,
}: CreateUserModalProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "owner">("admin");
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isOwner = currentUser.value?.role === "owner";

  // Generate a strong random password (never shown to anyone)
  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!username.trim() || !email.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const result = await authService.createUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: generatePassword(), // ← required field
        role,
        must_change_password: mustChangePassword,
        created_by: currentUser.value?.id, // optional but nice to have
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onUserCreated?.();
          onClose();
        }, 1500);
      } else {
        setError(result.error || "Failed to create user");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="bg-brand/10 rounded-full p-2">
              <UserPlus className="h-6 w-6 text-brand" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Create New User</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              User created successfully! An invitation email has been sent.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
              className="input pl-10"
              placeholder="johndoe"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              className="input pl-10"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(
                  (e.target as HTMLSelectElement).value as "admin" | "owner"
                )
              }
              className="input"
            >
              <option value="admin">Admin</option>
              {isOwner && <option value="owner">Owner</option>}
            </select>
            {role === "owner" && (
              <p className="mt-2 text-sm text-amber-600">
                Owner has full system access, including creating other owners.
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="mustChangePassword"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.currentTarget.checked)}
              className="h-4 w-4 text-brand border-gray-300 rounded"
            />
            <label
              htmlFor="mustChangePassword"
              className="text-sm text-gray-700"
            >
              <Lock className="inline h-4 w-4 mr-1" />
              Force password change on first login (recommended)
            </label>
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
              disabled={loading || success}
              className="btn btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Creating...</span>
                </>
              ) : success ? (
                "Created!"
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
