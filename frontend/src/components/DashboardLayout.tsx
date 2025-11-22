import { LogOut, User, Shield } from "lucide-preact";
import { authService } from "../services/auth";
import { currentUser } from "../store/auth";

interface DashboardLayoutProps {
  title?: string;
  children: preact.ComponentChildren;
  actions?: preact.ComponentChildren;
  tabs?: {
    id: string;
    label: string;
    icon: any;
    isActive: boolean;
    onClick: () => void;
  }[];
}

export function DashboardLayout({
  children,
  actions,
  tabs,
}: DashboardLayoutProps) {
  const user = currentUser.value;

  const handleLogout = async () => {
    await authService.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo Area */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-gray-900 text-brand p-1.5 rounded-md">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-gray-900">
                  Khluys
                </span>
              </div>
              <span className="h-6 w-px bg-gray-200 mx-2"></span>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 uppercase tracking-wide">
                {user?.role} Dashboard
              </span>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 border-r border-gray-200 pr-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.username}
                  </p>
                </div>
                <div className="bg-gray-100 p-1.5 rounded-full border border-gray-200">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Sub-header) */}
        {tabs && tabs.length > 0 && (
          <div className="border-t border-gray-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={tab.onClick}
                      className={`
                        group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200
                        ${
                          tab.isActive
                            ? "border-brand text-gray-900"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }
                      `}
                    >
                      <Icon
                        className={`
                        -ml-0.5 mr-2 h-4 w-4
                        ${
                          tab.isActive
                            ? "text-brand"
                            : "text-gray-400 group-hover:text-gray-500"
                        }
                      `}
                      />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
        {actions && <div className="mb-6 flex justify-end">{actions}</div>}
        {children}
      </main>
    </div>
  );
}
