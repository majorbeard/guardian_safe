import { useEffect } from "preact/hooks";
import { Shield } from "lucide-preact";
import { mobileAuthService } from "./services/auth";
import {
  isAuthenticated,
  isLoading,
  currentUser,
  currentSafe,
} from "./store/auth";
import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LoadingSpinner } from "./components/LoadingSpinner";

export function App() {
  const authenticated = isAuthenticated.value;
  const loading = isLoading.value;
  const user = currentUser.value;
  const safe = currentSafe.value;

  useEffect(() => {
    mobileAuthService.initialize();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Connecting to Guardian Safe...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen />;
  }

  // Show main dashboard - it handles everything now
  return <DashboardScreen />;
}

export default App;
