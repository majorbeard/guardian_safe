import { useEffect, useMemo } from "preact/hooks";
import { authService } from "./services/auth";
import { dataService } from "./services/data";
import { isAuthenticated, isLoading, currentUser } from "./store/auth";
import { LoginPage } from "./components/LoginPage";
import { OwnerDashboard } from "./components/OwnerDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { CustomerTrackingPage } from "./components/CustomerTrackingPage";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { LoadingSpinner } from "./components/LoadingSpinner";

export function App() {
  const authenticated = isAuthenticated.value;
  const loading = isLoading.value;
  const user = currentUser.value;

  // Simple client-side routing
  const currentPath = useMemo(() => {
    return window.location.pathname;
  }, [window.location.pathname]);

  const trackingToken = useMemo(() => {
    const match = currentPath.match(/^\/track\/([^\/]+)$/);
    return match ? match[1] : null;
  }, [currentPath]);

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

    // Cleanup on unmount
    return () => {
      if (authenticated) {
        dataService.cleanup();
      }
    };
  }, [authenticated, user]);

  // Handle customer tracking route (public access)
  if (trackingToken) {
    return <CustomerTrackingPage trackingToken={trackingToken} />;
  }

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
