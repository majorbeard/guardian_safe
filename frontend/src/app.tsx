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
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/Toast";
import { setupNetworkListeners } from "./utils/networkHelpers";

export function App() {
  const authenticated = isAuthenticated.value;
  const loading = isLoading.value;
  const user = currentUser.value;

  const currentPath = useMemo(() => {
    return window.location.pathname;
  }, [window.location.pathname]);

  const trackingToken = useMemo(() => {
    const match = currentPath.match(/^\/track\/([^\/]+)$/);
    return match ? match[1] : null;
  }, [currentPath]);

  useEffect(() => {
    // Setup network listeners
    setupNetworkListeners();

    // Initialize auth
    authService.initialize();
  }, []);

  useEffect(() => {
    if (authenticated && user) {
      dataService.loadUserData();
      dataService.setupRealtimeSubscriptions();
    }

    return () => {
      if (authenticated) {
        dataService.cleanup();
      }
    };
  }, [authenticated, user]);

  if (trackingToken) {
    return (
      <ErrorBoundary>
        <ToastContainer />
        <CustomerTrackingPage trackingToken={trackingToken} />
      </ErrorBoundary>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <ErrorBoundary>
        <ToastContainer />
        <LoginPage />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ToastContainer />
      {user?.must_change_password && <ChangePasswordModal />}
      {user?.role === "owner" ? <OwnerDashboard /> : <AdminDashboard />}
    </ErrorBoundary>
  );
}

export default App;
