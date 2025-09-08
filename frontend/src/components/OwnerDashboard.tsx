import { useState } from "preact/hooks";
import { Plus, Users, Shield, Package } from "lucide-preact";
import { DashboardLayout } from "./DashboardLayout";
import { CreateUserModal } from "./CreateUserModal";
import { CreateSafeModal } from "./CreateSafeModal";
import { UsersList } from "./UsersList";
import { SafesList } from "./SafesList";
import { TripsList } from "./TripsList";
import { StatsCards } from "./StatsCards";
import { safes, trips } from "../store/data";

export function OwnerDashboard() {
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateSafe, setShowCreateSafe] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "safes" | "trips"
  >("overview");

  const safesList = safes.value;
  const tripsList = trips.value;

  const stats = {
    totalSafes: safesList.length,
    activeSafes: safesList.filter((s) => s.status === "active").length,
    totalTrips: tripsList.length,
    activeTrips: tripsList.filter((t) => t.status === "in_transit").length,
  };

  const actions = (
    <div className="flex space-x-3">
      <button
        onClick={() => setShowCreateUser(true)}
        className="btn btn-secondary"
      >
        <Users className="h-4 w-4 mr-2" />
        Add User
      </button>
      <button
        onClick={() => setShowCreateSafe(true)}
        className="btn btn-primary"
      >
        <Plus className="h-4 w-4 mr-2" />
        Register Safe
      </button>
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: Package },
    { id: "users", label: "Users", icon: Users },
    { id: "safes", label: "Safes", icon: Shield },
    { id: "trips", label: "Trips", icon: Package },
  ];

  return (
    <>
      <DashboardLayout title="Guardian Safe" actions={actions}>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Recent Safes
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
          </div>
        )}

        {activeTab === "users" && <UsersList />}
        {activeTab === "safes" && <SafesList />}
        {activeTab === "trips" && <TripsList />}
      </DashboardLayout>

      {/* Modals */}
      {showCreateUser && (
        <CreateUserModal onClose={() => setShowCreateUser(false)} />
      )}
      {showCreateSafe && (
        <CreateSafeModal onClose={() => setShowCreateSafe(false)} />
      )}
    </>
  );
}
