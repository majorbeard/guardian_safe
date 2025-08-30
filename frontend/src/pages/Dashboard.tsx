import { useState } from "preact/hooks";
import Sidebar from "../components/Sidebar";
import OverviewPage from "./OverviewPage";
import LiveMapPage from "./LiveMapPage";
import TripsPage from "./TripsPage";
import SafesPage from "./SafesPage";
import UsersPage from "./UsersPage";
import AuditPage from "./AuditPage";
import AlertsPage from "./AlertsPage";

export default function Dashboard() {
  const [activeView, setActiveView] = useState("overview");

  const renderCurrentView = () => {
    switch (activeView) {
      case "overview":
        return <OverviewPage />;
      case "map":
        return <LiveMapPage />;
      case "trips":
        return <TripsPage />;
      case "safes":
        return <SafesPage />;
      case "users":
        return <UsersPage />;
      case "audit":
        return <AuditPage />;
      case "alerts":
        return <AlertsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div class="flex h-screen bg-gray-50">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main class="flex-1 overflow-hidden">{renderCurrentView()}</main>
    </div>
  );
}
