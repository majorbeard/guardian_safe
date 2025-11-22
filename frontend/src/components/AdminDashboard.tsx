import { useState } from "preact/hooks";
import { Plus, Shield, Package, MapPin, Activity } from "lucide-preact";
import { DashboardLayout } from "./DashboardLayout";
import { CreateTripModal } from "./CreateTripModal";
import { SafesList } from "./SafesList";
import { TripsList } from "./TripsList";
import { StatsCards } from "./StatsCards";
import { LiveTracking } from "./LiveTracking";
import { safes, trips } from "../store/data";
import { currentUser } from "../store/auth";

export function AdminDashboard() {
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "safes" | "trips" | "tracking"
  >("overview");

  const user = currentUser.value;
  const userSafes = safes.value.filter((safe) => safe.assigned_to === user?.id);
  const userTrips = trips.value;

  // Filter specifically for active trips to determine tab visibility
  const activeTripsList = userTrips.filter((t) => t.status === "in_transit");
  const hasActiveTrips = activeTripsList.length > 0;

  // Get only the safes that are currently on a trip
  const activeSafeIds = activeTripsList.map((t) => t.safe_id);
  const safesInTransit = userSafes.filter((s) => activeSafeIds.includes(s.id));

  const stats = {
    totalSafes: userSafes.length,
    activeSafes: userSafes.filter((s) => s.status === "active").length,
    totalTrips: userTrips.length,
    activeTrips: activeTripsList.length,
  };

  const actions = (
    <button
      onClick={() => setShowCreateTrip(true)}
      className="btn btn-primary"
      disabled={userSafes.length === 0}
    >
      <Plus className="h-4 w-4 mr-2" />
      Book Trip
    </button>
  );

  // Define tabs - Logic prevents 'tracking' from appearing if no active trips
  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: Activity,
      isActive: activeTab === "overview",
      onClick: () => setActiveTab("overview"),
    },
    {
      id: "safes",
      label: "My Safes",
      icon: Shield,
      isActive: activeTab === "safes",
      onClick: () => setActiveTab("safes"),
    },
    {
      id: "trips",
      label: "My Trips",
      icon: Package,
      isActive: activeTab === "trips",
      onClick: () => setActiveTab("trips"),
    },
  ];

  // Only add Live Tracking tab if there are active trips
  if (hasActiveTrips) {
    tabs.push({
      id: "tracking",
      label: "Live Tracking",
      icon: MapPin,
      isActive: activeTab === "tracking",
      onClick: () => setActiveTab("tracking"),
    });
  }

  return (
    <>
      <DashboardLayout tabs={tabs as any} actions={actions}>
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            <StatsCards stats={stats} />

            {userSafes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Safes Assigned
                </h3>
                <p className="text-gray-500">
                  Contact your administrator to get safes assigned to your
                  account.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      My Safes
                    </h3>
                    <button
                      onClick={() => setActiveTab("safes")}
                      className="text-sm text-brand hover:text-brand-hover"
                    >
                      View all
                    </button>
                  </div>
                  <SafesList limit={5} showActions={false} />
                </div>

                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      Recent Trips
                    </h3>
                    <button
                      onClick={() => setActiveTab("trips")}
                      className="text-sm text-brand hover:text-brand-hover"
                    >
                      View all
                    </button>
                  </div>
                  <TripsList limit={5} showActions={false} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === "safes" && (
          <div className="animate-fade-in">
            <SafesList />
          </div>
        )}
        {activeTab === "trips" && (
          <div className="animate-fade-in">
            <TripsList />
          </div>
        )}

        {/* Live Tracking - Only shows safes currently in transit */}
        {activeTab === "tracking" && hasActiveTrips && (
          <div className="animate-fade-in">
            <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-800 px-4 py-3 rounded-md text-sm flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Showing {safesInTransit.length} safe
              {safesInTransit.length !== 1 ? "s" : ""} currently in transit.
            </div>
            <LiveTracking safes={safesInTransit} />
          </div>
        )}
      </DashboardLayout>

      {/* Modals */}
      {showCreateTrip && (
        <CreateTripModal
          onClose={() => setShowCreateTrip(false)}
          availableSafes={userSafes.filter((safe) => safe.status === "active")}
        />
      )}
    </>
  );
}
