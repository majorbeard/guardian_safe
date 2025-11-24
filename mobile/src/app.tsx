import { useEffect } from "preact/hooks";
import { App as CapacitorApp } from "@capacitor/app";
import { mobileAuthService } from "./services/auth";
import { isAuthenticated, isLoading } from "./store/auth";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LoadingSpinner } from "./components/LoadingSpinner";

export function App() {
  const authenticated = isAuthenticated.value;
  const loading = isLoading.value;

  useEffect(() => {
    // 1. Initialize auth on app start
    mobileAuthService.initialize();

    let listener: any = null;

    const setupListener = async () => {
      listener = await CapacitorApp.addListener(
        "appStateChange",
        async ({ isActive }) => {
          // Only check session if we are already authenticated
          if (isActive && isAuthenticated.value) {
            console.log("App resumed, checking session...");

            // Small delay to ensure storage is ready
            setTimeout(async () => {
              const sessionToken = await mobileAuthService.getSessionToken();
              // Only logout if we definitely got a NULL token (expired/missing)
              // AND we aren't currently in a loading state
              if (!sessionToken && !isLoading.value) {
                console.log("Session expired in background, logging out");
                await mobileAuthService.logout();
              }
            }, 1000);
          }
        }
      );
    };

    setupListener();

    return () => {
      if (listener) listener.remove();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Connecting to Khluys...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen />;
  }

  return <DashboardScreen />;
}

export default App;
