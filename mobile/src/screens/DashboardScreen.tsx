import { useState, useEffect } from "preact/hooks";
import { LogOut, Package, MapPin, Shield, User } from "lucide-preact";
import { mobileAuthService } from "../services/auth";
import { currentUser } from "../store/auth";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { supabase } from "../services/supabase";
import type { Trip, Safe } from "../types";

export function DashboardScreen() {
  const user = currentUser.value;
  const [trips, setTrips] = useState<Trip[]>([]);
  const [safes, setSafes] = useState<Safe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"trips" | "safes">("trips");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load user's assigned safes
      const { data: safesData } = await supabase
        .from("safes")
        .select("*")
        .eq("assigned_to", user?.id)
        .order("created_at", { ascending: false });

      if (safesData) setSafes(safesData);

      // Load trips for user's safes
      if (safesData?.length) {
        const safeIds = safesData.map((safe) => safe.id);
        const { data: tripsData } = await supabase
          .from("trips")
          .select("*")
          .in("safe_id", safeIds)
          .in("status", ["pending", "in_transit"])
          .order("scheduled_pickup", { ascending: true });

        if (tripsData) setTrips(tripsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await mobileAuthService.logout();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "in_transit":
        return "bg-yellow-100 text-yellow-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 rounded-lg p-2">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Guardian Safe
                </h1>
                <p className="text-sm text-gray-500">Mobile Driver App</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-blue-50 px-4 py-3 border-b">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 rounded-full p-2">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-900">{user?.username}</p>
            <p className="text-sm text-blue-600">
              Driver • {safes.length} Safe(s) Assigned
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab("trips")}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
              activeTab === "trips"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" />
            Active Trips ({trips.length})
          </button>
          <button
            onClick={() => setActiveTab("safes")}
            className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
              activeTab === "safes"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            My Safes ({safes.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-20">
        {activeTab === "trips" ? (
          <div className="space-y-4">
            {trips.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Active Trips
                </h3>
                <p className="text-gray-500">
                  No pending or in-transit deliveries assigned to your safes.
                </p>
              </div>
            ) : (
              trips.map((trip) => (
                <div key={trip.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 rounded-lg p-2">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {trip.client_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {trip.id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        trip.status
                      )}`}
                    >
                      {trip.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Pickup
                        </p>
                        <p className="text-sm text-gray-600">
                          {trip.pickup_address}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(trip.scheduled_pickup).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Delivery
                        </p>
                        <p className="text-sm text-gray-600">
                          {trip.delivery_address}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(trip.scheduled_delivery).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {trip.special_instructions && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Instructions:</strong>{" "}
                        {trip.special_instructions}
                      </p>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      Start Delivery
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {safes.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Safes Assigned
                </h3>
                <p className="text-gray-500">
                  Contact your administrator to get safes assigned.
                </p>
              </div>
            ) : (
              safes.map((safe) => (
                <div key={safe.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-3 rounded-lg ${
                          safe.status === "active"
                            ? "bg-green-100"
                            : "bg-gray-100"
                        }`}
                      >
                        <Shield
                          className={`h-6 w-6 ${
                            safe.status === "active"
                              ? "text-green-600"
                              : "text-gray-600"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Safe {safe.serial_number}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Battery: {safe.battery_level}% •{" "}
                          {safe.is_locked ? "Locked" : "Unlocked"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        safe.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {safe.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 flex space-x-2">
                    <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                      Connect
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Status
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
