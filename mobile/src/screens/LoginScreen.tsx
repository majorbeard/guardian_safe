import { useState } from "preact/hooks";
import { Shield, Eye, EyeOff, AlertTriangle, ArrowRight } from "lucide-preact";
import { mobileAuthService } from "../services/auth";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { validateUsername, validatePassword } from "../utils/validation";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      errors.username = usernameValidation.error;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.error;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await mobileAuthService.login(username, password);

      if (!result.success) {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
        <div className="mx-auto h-16 w-16 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm mb-6">
          <Shield className="h-8 w-8 text-brand" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
          Driver Access
        </h2>
        <p className="mt-2 text-sm text-gray-500">Kluys Secure Logistics</p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="username" className="label">
              Username
            </label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className={`input ${
                  validationErrors.username
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : ""
                }`}
                placeholder="Enter username"
                value={username}
                onInput={(e) => {
                  setUsername((e.target as HTMLInputElement).value);
                  setValidationErrors({
                    ...validationErrors,
                    username: undefined,
                  });
                }}
              />
              {validationErrors.username && (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.username}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className={`input pr-10 ${
                  validationErrors.password
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : ""
                }`}
                placeholder="Enter password"
                value={password}
                onInput={(e) => {
                  setPassword((e.target as HTMLInputElement).value);
                  setValidationErrors({
                    ...validationErrors,
                    password: undefined,
                  });
                }}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-600">
                {validationErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-3 text-base shadow-md"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <LoadingSpinner
                  size="small"
                  className="text-white border-white"
                />
                <span>Authenticating...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span>Sign In</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            )}
          </button>
        </form>

        <p className="mt-10 text-center text-xs text-gray-400">
          V1.0 • For Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
