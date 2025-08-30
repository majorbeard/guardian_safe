import { useState, useEffect } from "preact/hooks";
import {
  Plus,
  Users,
  Search,
  Edit,
  Trash2,
  Shield,
  Eye,
  EyeOff,
} from "lucide-preact";
import { apiService } from "../services/api";
import Button from "../components/Button";
import Input from "../components/Input";
import type { User, UserRole } from "../types";
import { formatDistanceToNow } from "date-fns";

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const response = await apiService.getUsers();

    if (response.success && response.data) {
      setUsers(response.data);
    }

    setLoading(false);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const CreateUserModal = () => {
    const [formData, setFormData] = useState({
      username: "",
      role: "courier" as UserRole,
      password: "",
      confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const generatePassword = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setFormData((prev) => ({
        ...prev,
        password,
        confirmPassword: password,
      }));
    };

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      setError("");

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters long");
        return;
      }

      setSubmitting(true);

      try {
        const userData = {
          username: formData.username.trim(),
          role: formData.role,
          password: formData.password,
          isActive: true,
        };

        const response = await apiService.createUser(userData);

        if (response.success && response.data) {
          setUsers((prev) => [...prev, response.data!]);
          setShowCreateModal(false);
          setFormData({
            username: "",
            role: "courier",
            password: "",
            confirmPassword: "",
          });
        } else {
          setError(response.error || "Failed to create user");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Create New User</h2>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              ×
            </Button>
          </div>

          <form onSubmit={(e) => handleSubmit(e)} class="space-y-4">
            {error && (
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <Input
              label="Username"
              value={formData.username}
              onInput={(value) =>
                setFormData((prev) => ({ ...prev, username: value }))
              }
              placeholder="Enter username"
              required
            />

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Role <span class="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    role: (e.target as HTMLSelectElement).value as UserRole,
                  }))
                }
                class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="courier">Courier</option>
                <option value="admin">Admin</option>
                <option value="auditor">Auditor</option>
              </select>
            </div>

            <div class="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onInput={(value) =>
                  setFormData((prev) => ({ ...prev, password: value }))
                }
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                class="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff class="h-5 w-5" />
                ) : (
                  <Eye class="h-5 w-5" />
                )}
              </button>
            </div>

            <div class="flex justify-between items-center">
              <Button
                type="button"
                variant="ghost"
                onClick={generatePassword}
                className="text-sm"
              >
                Generate Password
              </Button>
            </div>

            <Input
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onInput={(value) =>
                setFormData((prev) => ({ ...prev, confirmPassword: value }))
              }
              placeholder="Confirm password"
              required
            />

            <div class="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
              <p class="font-medium mb-1">Important:</p>
              <p>
                The user will need to change their password on first login. Make
                sure to securely share the temporary password.
              </p>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={submitting}>
                Create User
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const UserDetailsModal = ({ user }: { user: User }) => {
    const [updating, setUpdating] = useState(false);

    const toggleUserStatus = async () => {
      setUpdating(true);
      try {
        const response = await apiService.updateUser(user.id, {
          isActive: !user.isActive,
        });

        if (response.success && response.data) {
          setUsers((prev) =>
            prev.map((u) => (u.id === user.id ? response.data! : u))
          );
          setSelectedUser(response.data);
        }
      } catch (error) {
        console.error("Failed to update user:", error);
      } finally {
        setUpdating(false);
      }
    };

    return (
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-lg">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">User Details</h2>
            <Button variant="ghost" onClick={() => setSelectedUser(null)}>
              ×
            </Button>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Username
                </label>
                <p class="text-lg text-gray-900">{user.username}</p>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">Role</label>
                <p class="text-lg text-gray-900 capitalize">{user.role}</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium text-gray-500">Status</label>
                <span
                  class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <label class="text-sm font-medium text-gray-500">Created</label>
                <p class="text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {user.lastLogin && (
              <div>
                <label class="text-sm font-medium text-gray-500">
                  Last Login
                </label>
                <p class="text-sm text-gray-900">
                  {formatDistanceToNow(new Date(user.lastLogin))} ago
                </p>
              </div>
            )}

            <div class="pt-4 border-t border-gray-200">
              <label class="text-sm font-medium text-gray-500 mb-3 block">
                Actions
              </label>
              <div class="space-y-2">
                <Button
                  variant={user.isActive ? "danger" : "primary"}
                  onClick={toggleUserStatus}
                  loading={updating}
                  disabled={updating}
                  className="w-full"
                >
                  {user.isActive ? "Deactivate User" : "Activate User"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    /* TODO: Reset password */
                  }}
                  className="w-full"
                >
                  Reset Password
                </Button>
              </div>
            </div>

            {!user.isActive && (
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p class="text-sm text-yellow-800">
                  This user is inactive and cannot log in to the system.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div class="p-6">
        <div class="animate-pulse space-y-4">
          <div class="h-8 bg-gray-200 rounded w-1/4" />
          <div class="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const activeUsers = users.filter((user) => user.isActive);
  const inactiveUsers = users.filter((user) => !user.isActive);
  const adminUsers = users.filter((user) => user.role === "admin");

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">User Management</h1>
          <p class="text-gray-600">Manage system users and access control</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus class="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Users class="h-8 w-8 text-blue-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Users</p>
              <p class="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Users class="h-8 w-8 text-green-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Active Users</p>
              <p class="text-2xl font-bold text-gray-900">
                {activeUsers.length}
              </p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Users class="h-8 w-8 text-red-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Inactive Users</p>
              <p class="text-2xl font-bold text-gray-900">
                {inactiveUsers.length}
              </p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Shield class="h-8 w-8 text-purple-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Administrators</p>
              <p class="text-2xl font-bold text-gray-900">
                {adminUsers.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div class="bg-white rounded-lg shadow p-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by username or role..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users List */}
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">
            {filteredUsers.length} User{filteredUsers.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {filteredUsers.length === 0 ? (
          <div class="p-8 text-center">
            <Users class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">No users found</p>
          </div>
        ) : (
          <div class="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                class="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedUser(user)}
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <div
                      class={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                        user.role === "admin"
                          ? "bg-purple-500"
                          : user.role === "courier"
                          ? "bg-blue-500"
                          : "bg-green-500"
                      }`}
                    >
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 class="font-medium text-gray-900">{user.username}</h3>
                      <p class="text-sm text-gray-500 capitalize">
                        {user.role}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center space-x-4">
                    <div class="text-right">
                      <span
                        class={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                      {user.lastLogin && (
                        <p class="text-xs text-gray-500 mt-1">
                          Last login:{" "}
                          {formatDistanceToNow(new Date(user.lastLogin))} ago
                        </p>
                      )}
                    </div>
                    <div class="text-right">
                      <p class="text-sm text-gray-500">
                        Created {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && <CreateUserModal />}
      {selectedUser && <UserDetailsModal user={selectedUser} />}
    </div>
  );
}
