import { useEffect } from "preact/hooks";
import { authState, authActions } from "./store/auth";
import { wsService } from "./services/websocket";
import { apiService } from "./services/api";

// Components
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import LoadingSpinner from "./components/LoadingSpinner";

export function App() {
  // Initialize auth state on app load
  useEffect(() => {
    const initAuth = async () => {
      authActions.setLoading(true);

      try {
        const response = await apiService.getCurrentUser();
        if (response.success && response.data) {
          authActions.setUser(response.data);
          // Connect WebSocket for authenticated users
          wsService.connect();
        } else {
          authActions.setLoading(false);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        authActions.setLoading(false);
      }
    };

    initAuth();

    // Cleanup WebSocket on unmount
    return () => {
      wsService.disconnect();
    };
  }, []);

  // Show loading spinner during auth check
  if (authState.value.loading) {
    return (
      <div class="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!authState.value.isAuthenticated) {
    return <LoginPage />;
  }

  // Show main dashboard
  return <Dashboard />;
}
