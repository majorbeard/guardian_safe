import { useState } from "preact/hooks";
import { Shield, Eye, EyeOff } from "lucide-preact";
import { apiService } from "../services/api";
import { authActions } from "../store/auth";
import { notificationActions } from "../store/notifications";
import { wsService } from "../services/websocket";
import Button from "../components/Button";
import Input from "../components/Input";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: Event) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      notificationActions.warning(
        "Missing Information",
        "Please enter both username and password"
      );
      return;
    }

    setLoading(true);

    try {
      const response = await apiService.login(username.trim(), password);

      if (response.success && response.data) {
        authActions.setUser(response.data);
        // Connect WebSocket after successful login
        wsService.connect();
        notificationActions.success(
          "Login Successful",
          `Welcome back, ${response.data.username}!`
        );
      } else {
        notificationActions.error(
          "Login Failed",
          response.error || "Invalid username or password"
        );
      }
    } catch (err) {
      notificationActions.error(
        "Network Error",
        "Unable to connect to server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center px-4">
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <div class="flex justify-center">
            <div class="bg-white rounded-full p-3">
              <Shield class="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h2 class="mt-6 text-3xl font-extrabold text-white">Guardian Safe</h2>
          <p class="mt-2 text-sm text-blue-100">
            Secure Delivery Management System
          </p>
        </div>

        <div class="bg-white rounded-xl shadow-xl p-8">
          <form class="space-y-6" onSubmit={handleLogin}>
            <Input
              label="Username"
              type="text"
              value={username}
              placeholder="Enter your username"
              required
              onInput={setUsername}
            />

            <div class="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="Enter your password"
                required
                onInput={setPassword}
              />
              <button
                type="button"
                class="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff class="h-5 w-5" />
                ) : (
                  <Eye class="h-5 w-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              loading={loading}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
          </form>

          <div class="mt-6 text-center">
            <p class="text-xs text-gray-500">
              Contact your administrator to reset your password or create a new
              account.
            </p>
          </div>
        </div>

        <div class="text-center text-blue-100 text-sm">
          © 2025 Guardian Safe System. All rights reserved.
        </div>
      </div>
    </div>
  );
}
