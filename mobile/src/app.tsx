import { useEffect } from "preact/hooks";
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
import { Shield } from "lucide-preact";

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

  // Show safe info after login
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 rounded-lg p-2">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Safe {safe?.serial_number}
            </h1>
            <p className="text-sm text-gray-500">
              Driver: {user?.driver_name || user?.username}
            </p>
          </div>
        </div>
      </div>

      {/* Temporary success message */}
      <div className="px-4 py-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-green-900 mb-2">
            🎉 Login Successful!
          </h2>
          <p className="text-green-700 mb-4">
            Successfully connected to Safe {safe?.serial_number}
          </p>
          <div className="bg-white rounded p-4 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Safe Status:</h3>
            <p>
              Status: <span className="font-mono">{safe?.status}</span>
            </p>
            <p>
              Battery: <span className="font-mono">{safe?.battery_level}%</span>
            </p>
            <p>
              Locked:{" "}
              <span className="font-mono">
                {safe?.is_locked ? "Yes" : "No"}
              </span>
            </p>
          </div>
          <button
            onClick={() => mobileAuthService.logout()}
            className="mt-4 bg-gray-600 text-white py-2 px-4 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
