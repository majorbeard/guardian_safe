import { useState, useEffect } from "preact/hooks";
import { User, Calendar, Shield } from "lucide-preact";
import { supabase } from "../lib/supabase";
import { LoadingSpinner } from "./LoadingSpinner";
import { format } from "date-fns";

interface UserData {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export function UsersList() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles") // Changed from "users"
        .select("id, username, role, is_active, created_at, created_by")
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles") // Changed from "users"
        .update({ is_active: !currentStatus })
        .eq("id", userId);

      if (error) {
        console.error("Failed to update user status:", error);
      } else {
        // Refresh users list
        loadUsers();
      }
    } catch (err) {
      console.error("Error updating user status:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="medium" />
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }

  const adminUsers = users.filter((user) => user.role === "admin");
  const ownerUsers = users.filter((user) => user.role === "owner");

  return (
    <div className="space-y-6">
      {/* Owner Users */}
      {ownerUsers.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <span>Owner Accounts ({ownerUsers.length})</span>
          </h3>

          <div className="space-y-3">
            {ownerUsers.map((user) => (
              <div
                key={user.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-purple-100 rounded-full p-2">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">
                        {user.username}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Joined{" "}
                            {format(new Date(user.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? "text-green-800 bg-green-100"
                          : "text-red-800 bg-red-100"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Users */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
          <User className="h-5 w-5 text-blue-600" />
          <span>Admin Accounts ({adminUsers.length})</span>
        </h3>

        {adminUsers.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No admin users created yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {adminUsers.map((user) => (
              <div
                key={user.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 rounded-full p-2">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">
                        {user.username}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Joined{" "}
                            {format(new Date(user.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? "text-green-800 bg-green-100"
                          : "text-red-800 bg-red-100"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>

                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={`text-sm ${
                        user.is_active
                          ? "text-red-600 hover:text-red-800"
                          : "text-green-600 hover:text-green-800"
                      }`}
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
