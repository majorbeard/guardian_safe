import {
  Shield,
  Map,
  Package,
  Settings,
  Users,
  FileText,
  LogOut,
  Bell,
  Activity,
} from "lucide-preact";
import { clsx } from "clsx";
import { authState, authActions } from "../store/auth";
import { criticalAlerts, wsConnected } from "../store/realtime";
import { apiService } from "../services/api";
import { wsService } from "../services/websocket";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const user = authState.value.user;
  const criticalCount = criticalAlerts.value.length;
  const isConnected = wsConnected.value;

  const handleLogout = async () => {
    wsService.disconnect();
    await apiService.logout();
    authActions.logout();
  };

  const navigationItems = [
    {
      id: "overview",
      label: "Live Overview",
      icon: Activity,
      roles: ["admin", "courier", "auditor"],
    },
    {
      id: "map",
      label: "Live Tracking",
      icon: Map,
      roles: ["admin", "courier"],
      badge: criticalCount > 0 ? criticalCount : undefined,
    },
    {
      id: "trips",
      label: "Trip Management",
      icon: Package,
      roles: ["admin", "courier"],
    },
    {
      id: "safes",
      label: "Safe Management",
      icon: Shield,
      roles: ["admin"],
    },
    {
      id: "users",
      label: "User Management",
      icon: Users,
      roles: ["admin"],
    },
    {
      id: "audit",
      label: "Audit Logs",
      icon: FileText,
      roles: ["admin", "auditor"],
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: Bell,
      roles: ["admin", "courier", "auditor"],
      badge: criticalCount > 0 ? criticalCount : undefined,
    },
  ];

  // Filter navigation based on user role
  const visibleItems = navigationItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div class="bg-gray-900 text-white w-64 min-h-screen flex flex-col">
      {/* Header */}
      <div class="p-6 border-b border-gray-700">
        <div class="flex items-center space-x-3">
          <Shield class="h-8 w-8 text-blue-400" />
          <div>
            <h1 class="text-xl font-bold">Guardian Safe</h1>
            <p class="text-xs text-gray-400 capitalize">
              {user?.role} Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div class="px-6 py-3 border-b border-gray-700">
        <div class="flex items-center space-x-2 text-sm">
          <div
            class={clsx(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-400" : "bg-red-400"
            )}
          />
          <span class="text-gray-300">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav class="flex-1 p-6 space-y-2">
        {visibleItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              class={clsx(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <IconComponent class="h-5 w-5" />
              <span class="flex-1">{item.label}</span>
              {item.badge && (
                <span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div class="p-6 border-t border-gray-700">
        <div class="flex items-center space-x-3 mb-4">
          <div class="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            <span class="text-sm font-medium">
              {user?.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">
              {user?.username}
            </p>
            <p class="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          class="w-full flex items-center space-x-3 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut class="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
