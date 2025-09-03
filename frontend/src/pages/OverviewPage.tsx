import { useEffect, useState } from "preact/hooks";
import {
  Shield,
  Package,
  Battery,
  AlertTriangle,
  Activity,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  Target,
  BarChart3,
} from "lucide-preact";
import {
  systemStats,
  activeSafes,
  activeTrips,
  criticalAlerts,
  lowBatterySafes,
} from "../store/realtime";
import { apiService } from "../services/api";
import AlertBanner from "../components/AlertBanner";
import StatusBadge from "../components/StatusBadge";
import { StatsCard } from "../components/StatsCard";
import { realtimeActions } from "../store/realtime";
import { formatDistanceToNow } from "date-fns";

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");
  const [performanceData, setPerformanceData] = useState({
    tripCompletionRate: 94,
    averageDeliveryTime: 45, // minutes
    safeUptimePercentage: 98.5,
    batteryHealthScore: 87,
    securityIncidents: 2,
    maintenanceAlerts: 5,
  });

  const stats = systemStats.value;
  const safesActive = activeSafes.value;
  const tripsActive = activeTrips.value;
  const alerts = criticalAlerts.value.slice(0, 3); // Show top 3 critical alerts
  const lowBattery = lowBatterySafes.value;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Load initial data
      const [safesResponse, tripsResponse] = await Promise.all([
        apiService.getSafes(),
        apiService.getTrips(1, 50),
      ]);

      if (safesResponse.success && safesResponse.data) {
        realtimeActions.setSafes(safesResponse.data);
      }

      if (tripsResponse.success && tripsResponse.data) {
        realtimeActions.setTrips(tripsResponse.data.data);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  // Calculate trend data (mock for now - would come from API)
  const getTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.round(change * 10) / 10,
      direction: change >= 0 ? "up" : "down",
      label:
        timeRange === "24h"
          ? "vs yesterday"
          : timeRange === "7d"
          ? "vs last week"
          : "vs last month",
    };
  };

  // Quick Actions Component
  const QuickActions = () => (
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div class="grid grid-cols-2 gap-3">
        <button class="flex items-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
          <Package class="h-5 w-5 text-blue-600" />
          <span class="text-sm font-medium text-blue-700">New Trip</span>
        </button>
        <button class="flex items-center space-x-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
          <Shield class="h-5 w-5 text-green-600" />
          <span class="text-sm font-medium text-green-700">Register Safe</span>
        </button>
        <button class="flex items-center space-x-2 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
          <Users class="h-5 w-5 text-purple-600" />
          <span class="text-sm font-medium text-purple-700">Add User</span>
        </button>
        <button class="flex items-center space-x-2 p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
          <BarChart3 class="h-5 w-5 text-yellow-600" />
          <span class="text-sm font-medium text-yellow-700">View Reports</span>
        </button>
      </div>
    </div>
  );

  // Performance Metrics Component
  const PerformanceMetrics = () => (
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        <select
          value={timeRange}
          onChange={(e) =>
            setTimeRange((e.target as HTMLSelectElement).value as any)
          }
          class="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">
            {performanceData.tripCompletionRate}%
          </div>
          <p class="text-sm text-gray-500">Trip Success Rate</p>
          <div class="flex items-center justify-center mt-1">
            <TrendingUp class="h-3 w-3 text-green-500 mr-1" />
            <span class="text-xs text-green-600">+2.1%</span>
          </div>
        </div>

        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">
            {performanceData.averageDeliveryTime}m
          </div>
          <p class="text-sm text-gray-500">Avg Delivery Time</p>
          <div class="flex items-center justify-center mt-1">
            <TrendingDown class="h-3 w-3 text-green-500 mr-1" />
            <span class="text-xs text-green-600">-5.3%</span>
          </div>
        </div>

        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">
            {performanceData.safeUptimePercentage}%
          </div>
          <p class="text-sm text-gray-500">Safe Uptime</p>
          <div class="flex items-center justify-center mt-1">
            <TrendingUp class="h-3 w-3 text-green-500 mr-1" />
            <span class="text-xs text-green-600">+0.8%</span>
          </div>
        </div>

        <div class="text-center">
          <div class="text-2xl font-bold text-yellow-600">
            {performanceData.batteryHealthScore}%
          </div>
          <p class="text-sm text-gray-500">Battery Health</p>
          <div class="flex items-center justify-center mt-1">
            <TrendingDown class="h-3 w-3 text-red-500 mr-1" />
            <span class="text-xs text-red-600">-1.2%</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Activity Feed Component
  const ActivityFeed = () => {
    const activities = [
      {
        id: 1,
        type: "trip_completed",
        message: "Trip #TRP001 completed successfully",
        time: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        icon: Package,
        color: "text-green-600",
      },
      {
        id: 2,
        type: "safe_low_battery",
        message: "Safe SN12345 battery at 18%",
        time: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        icon: Battery,
        color: "text-yellow-600",
      },
      {
        id: 3,
        type: "safe_registered",
        message: "New safe SN67890 registered",
        time: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        icon: Shield,
        color: "text-blue-600",
      },
      {
        id: 4,
        type: "user_login",
        message: "Courier john.doe logged in",
        time: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        icon: Users,
        color: "text-gray-600",
      },
      {
        id: 5,
        type: "maintenance_alert",
        message: "Safe SN11111 maintenance due",
        time: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        icon: AlertTriangle,
        color: "text-orange-600",
      },
    ];

    return (
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h3>
        <div class="space-y-3 max-h-64 overflow-y-auto">
          {activities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <div key={activity.id} class="flex items-start space-x-3">
                <div class={`mt-1 ${activity.color}`}>
                  <IconComponent class="h-4 w-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-900">{activity.message}</p>
                  <p class="text-xs text-gray-500">
                    {formatDistanceToNow(activity.time)} ago
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div class="p-6">
        <div class="animate-pulse space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} class="bg-gray-200 h-24 rounded-lg" />
            ))}
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-gray-200 h-64 rounded-lg" />
            <div class="bg-gray-200 h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">System Overview</h1>
          <p class="text-gray-600">
            Real-time monitoring and performance dashboard
          </p>
        </div>
        <div class="flex items-center space-x-2 text-sm text-gray-500">
          <Activity class="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-red-700 flex items-center">
            <AlertTriangle class="h-5 w-5 mr-2" />
            Critical Alerts Requiring Attention
          </h2>
          {alerts.map((alert) => (
            <AlertBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => realtimeActions.acknowledgeAlert(alert.id)}
            />
          ))}
        </div>
      )}

      {/* Main Stats Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Safes"
          value={stats.activeSafes}
          icon={Shield}
          color="green"
          trend={getTrend(stats.activeSafes, stats.activeSafes - 2)}
          loading={loading}
        />
        <StatsCard
          title="Active Trips"
          value={stats.activeTrips}
          icon={Package}
          color="blue"
          trend={getTrend(stats.activeTrips, stats.activeTrips - 1)}
          loading={loading}
        />
        <StatsCard
          title="Average Battery"
          value={`${Math.round(stats.averageBatteryLevel)}%`}
          icon={Battery}
          color={
            stats.averageBatteryLevel > 50
              ? "green"
              : stats.averageBatteryLevel > 20
              ? "yellow"
              : "red"
          }
          trend={getTrend(
            stats.averageBatteryLevel,
            stats.averageBatteryLevel - 3
          )}
          loading={loading}
        />
        <StatsCard
          title="Critical Alerts"
          value={stats.criticalAlerts}
          icon={AlertTriangle}
          color="red"
          trend={getTrend(stats.criticalAlerts, stats.criticalAlerts + 1)}
          loading={loading}
        />
      </div>

      {/* Secondary Stats */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4 text-center">
          <div class="text-xl font-bold text-gray-900">{stats.totalSafes}</div>
          <p class="text-sm text-gray-500">Total Safes</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 text-center">
          <div class="text-xl font-bold text-gray-900">
            {stats.completedTripsToday}
          </div>
          <p class="text-sm text-gray-500">Trips Today</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 text-center">
          <div class="text-xl font-bold text-gray-900">{lowBattery.length}</div>
          <p class="text-sm text-gray-500">Low Battery</p>
        </div>
        <div class="bg-white rounded-lg shadow p-4 text-center">
          <div class="text-xl font-bold text-gray-900">
            {performanceData.securityIncidents}
          </div>
          <p class="text-sm text-gray-500">Security Events</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics - Takes 1 column */}
        <PerformanceMetrics />

        {/* Activity Feed - Takes 1 column */}
        <ActivityFeed />

        {/* Quick Actions - Takes 1 column */}
        <QuickActions />
      </div>

      {/* Active Items Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Safes */}
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Active Safes</h2>
              <span class="text-sm text-gray-500">
                {safesActive.length} online
              </span>
            </div>
          </div>
          <div class="p-6 max-h-80 overflow-y-auto">
            {safesActive.length === 0 ? (
              <div class="text-center py-8">
                <Shield class="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p class="text-gray-500">No active safes</p>
              </div>
            ) : (
              <div class="space-y-4">
                {safesActive.slice(0, 5).map((safe) => (
                  <div
                    key={safe.id}
                    class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div class="flex items-center space-x-3">
                      <div class="relative">
                        <Shield class="h-6 w-6 text-blue-500" />
                        {safe.batteryLevel < 20 && (
                          <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                        )}
                      </div>
                      <div>
                        <p class="font-medium text-gray-900">
                          Safe {safe.serialNumber}
                        </p>
                        <div class="flex items-center space-x-4 text-sm text-gray-500">
                          <span class="flex items-center">
                            <Battery class="h-3 w-3 mr-1" />
                            {safe.batteryLevel}%
                          </span>
                          <span>
                            {safe.isLocked ? "🔒 Locked" : "🔓 Unlocked"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <StatusBadge status={safe.status} type="safe" />
                      <p class="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(
                          new Date(safe.location.lastUpdate)
                        )}{" "}
                        ago
                      </p>
                    </div>
                  </div>
                ))}
                {safesActive.length > 5 && (
                  <div class="text-center pt-2">
                    <button class="text-sm text-blue-600 hover:text-blue-800">
                      View all {safesActive.length} active safes →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Trips */}
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Active Trips</h2>
              <span class="text-sm text-gray-500">
                {tripsActive.length} in progress
              </span>
            </div>
          </div>
          <div class="p-6 max-h-80 overflow-y-auto">
            {tripsActive.length === 0 ? (
              <div class="text-center py-8">
                <Package class="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p class="text-gray-500">No active trips</p>
              </div>
            ) : (
              <div class="space-y-4">
                {tripsActive.slice(0, 5).map((trip) => (
                  <div
                    key={trip.id}
                    class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div class="flex items-center space-x-3">
                      <Package class="h-6 w-6 text-green-500" />
                      <div>
                        <p class="font-medium text-gray-900">
                          {trip.clientName}
                        </p>
                        <div class="flex items-center space-x-4 text-sm text-gray-500">
                          <span class="flex items-center">
                            <Users class="h-3 w-3 mr-1" />
                            {trip.assignedCourier}
                          </span>
                          <span class="flex items-center">
                            <Shield class="h-3 w-3 mr-1" />
                            {trip.assignedSafe}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <StatusBadge status={trip.status} type="trip" />
                      <p class="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(trip.scheduledDelivery))}
                      </p>
                    </div>
                  </div>
                ))}
                {tripsActive.length > 5 && (
                  <div class="text-center pt-2">
                    <button class="text-sm text-blue-600 hover:text-blue-800">
                      View all {tripsActive.length} active trips →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Battery Safes Alert */}
      {lowBattery.length > 0 && (
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-center space-x-2">
              <Battery class="h-5 w-5 text-yellow-500" />
              <h2 class="text-lg font-semibold text-gray-900">
                Low Battery Safes ({lowBattery.length})
              </h2>
            </div>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowBattery.map((safe) => (
                <div
                  key={safe.id}
                  class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div class="flex items-center space-x-3">
                    <div class="w-2 h-2 bg-yellow-500 rounded-full" />
                    <div>
                      <p class="font-medium text-gray-900">
                        Safe {safe.serialNumber}
                      </p>
                      <p class="text-sm text-gray-600">
                        Battery: {safe.batteryLevel}%
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={safe.status} type="safe" />
                </div>
              ))}
            </div>
            <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p class="text-sm text-yellow-800">
                <AlertTriangle class="h-4 w-4 inline mr-1" />
                These safes require immediate battery replacement or charging.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Health Summary */}
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">
            System Health Summary
          </h2>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Health Score */}
            <div class="text-center">
              <div class="relative inline-flex items-center justify-center w-24 h-24">
                <div class="absolute inset-0 rounded-full border-8 border-gray-200" />
                <div
                  class="absolute inset-0 rounded-full border-8 border-green-500"
                  style={{
                    background: `conic-gradient(#10b981 ${
                      performanceData.safeUptimePercentage * 3.6
                    }deg, transparent 0deg)`,
                  }}
                />
                <div class="text-2xl font-bold text-gray-900">
                  {Math.round(performanceData.safeUptimePercentage)}%
                </div>
              </div>
              <p class="text-sm text-gray-500 mt-2">Overall Health</p>
            </div>

            {/* Key Metrics */}
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Safes Online</span>
                <span class="font-medium">
                  {Math.round((stats.activeSafes / stats.totalSafes) * 100)}%
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Trip Success Rate</span>
                <span class="font-medium text-green-600">
                  {performanceData.tripCompletionRate}%
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Security Score</span>
                <span class="font-medium">
                  {performanceData.securityIncidents === 0 ? (
                    <span class="text-green-600">Excellent</span>
                  ) : performanceData.securityIncidents < 5 ? (
                    <span class="text-yellow-600">Good</span>
                  ) : (
                    <span class="text-red-600">Needs Attention</span>
                  )}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-600">Maintenance Due</span>
                <span class="font-medium text-yellow-600">
                  {performanceData.maintenanceAlerts} safes
                </span>
              </div>
            </div>

            {/* Action Items */}
            <div class="space-y-2">
              <h4 class="text-sm font-medium text-gray-700">Action Items</h4>
              <div class="space-y-2">
                {lowBattery.length > 0 && (
                  <div class="flex items-center space-x-2 text-sm">
                    <div class="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span class="text-gray-600">
                      {lowBattery.length} batteries to replace
                    </span>
                  </div>
                )}
                {performanceData.maintenanceAlerts > 0 && (
                  <div class="flex items-center space-x-2 text-sm">
                    <div class="w-2 h-2 bg-orange-500 rounded-full" />
                    <span class="text-gray-600">
                      {performanceData.maintenanceAlerts} maintenance due
                    </span>
                  </div>
                )}
                {alerts.length > 0 && (
                  <div class="flex items-center space-x-2 text-sm">
                    <div class="w-2 h-2 bg-red-500 rounded-full" />
                    <span class="text-gray-600">
                      {alerts.length} critical alerts
                    </span>
                  </div>
                )}
                {lowBattery.length === 0 &&
                  performanceData.maintenanceAlerts === 0 &&
                  alerts.length === 0 && (
                    <div class="flex items-center space-x-2 text-sm">
                      <div class="w-2 h-2 bg-green-500 rounded-full" />
                      <span class="text-gray-600">All systems healthy</span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
