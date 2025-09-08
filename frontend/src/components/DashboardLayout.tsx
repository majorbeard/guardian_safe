import { LogOut, User, Shield } from "lucide-preact";
import { authService } from "../services/auth";
import { currentUser } from "../store/auth";

interface DashboardLayoutProps {
  title: string;
  children: preact.ComponentChildren;
  actions?: preact.ComponentChildren;
}

export function DashboardLayout({
  title,
  children,
  actions,
}: DashboardLayoutProps) {
  const user = currentUser.value;

  const handleLogout = async () => {
    await authService.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 rounded-lg p-2">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500 capitalize">
                  {user?.role} Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {actions}

              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 rounded-full p-2">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
