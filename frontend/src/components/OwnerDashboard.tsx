import { useState } from "preact/hooks";
import { Plus, Users, Shield, Package, Activity, MapPin } from "lucide-preact";
import { DashboardLayout } from "./DashboardLayout";
import { CreateUserModal } from "./CreateUserModal";
import { CreateSafeModal } from "./CreateSafeModal";
import { UsersList } from "./UsersList";
import { SafesList } from "./SafesList";
import { TripsList } from "./TripsList";
import { StatsCards } from "./StatsCards";
import { LiveTracking } from "./LiveTracking";
import { safes, trips } from "../store/data";
import { TripHistoryPage } from "./TripHistoryPage";
import { FileText } from "lucide-preact";

export function OwnerDashboard() {
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateSafe, setShowCreateSafe] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "safes" | "trips" | "tracking" | "history"
  >("overview");

  const safesList = safes.value;
  const tripsList = trips.value;

  const stats = {
    totalSafes: safesList.length,
    activeSafes: safesList.filter((s) => s.status === "active").length,
    totalTrips: tripsList.length,
    activeTrips: tripsList.filter((t) => t.status === "in_transit").length,
  };

  // Define Tabs Configuration - Added Tracking Tab
  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: Activity,
      isActive: activeTab === "overview",
      onClick: () => setActiveTab("overview"),
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      isActive: activeTab === "users",
      onClick: () => setActiveTab("users"),
    },
    {
      id: "safes",
      label: "Safes",
      icon: Shield,
      isActive: activeTab === "safes",
      onClick: () => setActiveTab("safes"),
    },
    {
      id: "trips",
      label: "Trips",
      icon: Package,
      isActive: activeTab === "trips",
      onClick: () => setActiveTab("trips"),
    },
    {
      id: "tracking",
      label: "Live Fleet",
      icon: MapPin,
      isActive: activeTab === "tracking",
      onClick: () => setActiveTab("tracking"),
    },
    {
      id: "history",
      label: "History",
      icon: FileText,
      isActive: activeTab === "history",
      onClick: () => setActiveTab("history"),
    },
  ];

  // Context-aware Actions
  const actions = (
    <div className="flex space-x-3">
      {activeTab === "users" && (
        <button
          onClick={() => setShowCreateUser(true)}
          className="btn btn-secondary"
        >
          <Users className="h-4 w-4 mr-2" /> Add User
        </button>
      )}
      {(activeTab === "safes" ||
        activeTab === "overview" ||
        activeTab === "tracking") && (
        <button
          onClick={() => setShowCreateSafe(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" /> Register Safe
        </button>
      )}
    </div>
  );

  return (
    <>
      <DashboardLayout tabs={tabs as any} actions={actions}>
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fade-in">
            <StatsCards stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    Recent Safes
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
          </div>
        )}

        {activeTab === "users" && (
          <div className="animate-fade-in">
            <UsersList />
          </div>
        )}
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

        {/* Owner sees ALL safes on the map at all times */}
        {activeTab === "tracking" && (
          <div className="animate-fade-in">
            <LiveTracking safes={safesList} />
          </div>
        )}

        {activeTab === "history" && (
          <div className="animate-fade-in">
            <TripHistoryPage />
          </div>
        )}
      </DashboardLayout>

      {showCreateUser && (
        <CreateUserModal onClose={() => setShowCreateUser(false)} />
      )}
      {showCreateSafe && (
        <CreateSafeModal onClose={() => setShowCreateSafe(false)} />
      )}
    </>
  );
}
