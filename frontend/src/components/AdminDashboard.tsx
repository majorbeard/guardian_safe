import { useState } from "preact/hooks";
import { Plus, Shield, Package, MapPin } from "lucide-preact";
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

  const stats = {
    totalSafes: userSafes.length,
    activeSafes: userSafes.filter((s) => s.status === "active").length,
    totalTrips: userTrips.length,
    activeTrips: userTrips.filter((t) => t.status === "in_transit").length,
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

  const tabs = [
    { id: "overview", label: "Overview", icon: Package },
    { id: "safes", label: "My Safes", icon: Shield },
    { id: "trips", label: "My Trips", icon: Package },
    { id: "tracking", label: "Live Tracking", icon: MapPin },
  ];

  return (
    <>
      <DashboardLayout title="My Safes" actions={actions}>
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <StatsCards stats={stats} />

            {userSafes.length === 0 ? (
              <div className="card text-center py-12">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    My Safes
                  </h3>
                  <SafesList limit={5} showActions={false} />
                </div>

                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Recent Trips
                  </h3>
                  <TripsList limit={5} showActions={false} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "safes" && <SafesList />}
        {activeTab === "trips" && <TripsList />}
        {activeTab === "tracking" && <LiveTracking safes={userSafes} />}
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
