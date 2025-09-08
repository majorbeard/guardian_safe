import { useEffect } from "preact/hooks";
import { authService } from "./services/auth";
import { dataService } from "./services/data";
import { isAuthenticated, isLoading, currentUser } from "./store/auth";
import { LoginPage } from "./components/LoginPage";
import { OwnerDashboard } from "./components/OwnerDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { LoadingSpinner } from "./components/LoadingSpinner";

export function App() {
  const authenticated = isAuthenticated.value;
  const loading = isLoading.value;
  const user = currentUser.value;

  useEffect(() => {
    // Initialize auth and data services
    authService.initialize();
  }, []);

  useEffect(() => {
    // Load data when user is authenticated
    if (authenticated && user) {
      dataService.loadUserData();
      dataService.setupRealtimeSubscriptions();
    }
  }, [authenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  return (
    <>
      {user?.must_change_password && <ChangePasswordModal />}

      {user?.role === "owner" ? <OwnerDashboard /> : <AdminDashboard />}
    </>
  );
}

export default App;
