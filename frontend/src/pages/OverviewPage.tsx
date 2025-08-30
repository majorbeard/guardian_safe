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
import { realtimeActions } from "../store/realtime";
import { formatDistanceToNow } from "date-fns";

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const stats = systemStats.value;
  const safesActive = activeSafes.value;
  const tripsActive = activeTrips.value;
  const alerts = criticalAlerts.value.slice(0, 5); // Show top 5 critical alerts
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

  const StatCard = ({
    title,
    value,
    icon: IconComponent,
    color = "blue",
    trend,
    subtitle,
  }: {
    title: string;
    value: number | string;
    icon: any;
    color?: "blue" | "green" | "yellow" | "red";
    trend?: string;
    subtitle?: string;
  }) => {
    const colorClasses = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      red: "bg-red-500",
    };

    return (
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class={`p-3 rounded-lg ${colorClasses[color]}`}>
            <IconComponent class="h-6 w-6 text-white" />
          </div>
          <div class="ml-4">
            <h3 class="text-sm font-medium text-gray-500">{title}</h3>
            <div class="flex items-baseline">
              <p class="text-2xl font-semibold text-gray-900">{value}</p>
              {trend && <span class="ml-2 text-sm text-gray-500">{trend}</span>}
            </div>
            {subtitle && <p class="text-sm text-gray-500">{subtitle}</p>}
          </div>
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
        </div>
      </div>
    );
  }

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Live Overview</h1>
        <p class="text-gray-600">
          Real-time system status and performance metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Safes"
          value={stats.activeSafes}
          icon={Shield}
          color="green"
          subtitle={`${stats.totalSafes} total safes`}
        />
        <StatCard
          title="Active Trips"
          value={stats.activeTrips}
          icon={Package}
          color="blue"
          subtitle={`${stats.completedTripsToday} completed today`}
        />
        <StatCard
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
          subtitle={`${lowBattery.length} safes below 20%`}
        />
        <StatCard
          title="Critical Alerts"
          value={stats.criticalAlerts}
          icon={AlertTriangle}
          color="red"
          subtitle="Require immediate attention"
        />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-gray-900">Critical Alerts</h2>
          <div class="space-y-3">
            {alerts.map((alert) => (
              <AlertBanner
                key={alert.id}
                alert={alert}
                onDismiss={() => realtimeActions.acknowledgeAlert(alert.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Safes & Trips */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Safes */}
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Active Safes</h2>
          </div>
          <div class="p-6">
            {safesActive.length === 0 ? (
              <p class="text-gray-500 text-center py-4">No active safes</p>
            ) : (
              <div class="space-y-3">
                {safesActive.slice(0, 5).map((safe) => (
                  <div
                    key={safe.id}
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div class="flex items-center space-x-3">
                      <Shield class="h-5 w-5 text-blue-500" />
                      <div>
                        <p class="font-medium text-gray-900">
                          Safe {safe.serialNumber}
                        </p>
                        <p class="text-sm text-gray-500">
                          Battery: {safe.batteryLevel}% •{" "}
                          {safe.isLocked ? "Locked" : "Unlocked"}
                        </p>
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
                  <p class="text-sm text-gray-500 text-center pt-2">
                    +{safesActive.length - 5} more safes
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Trips */}
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">Active Trips</h2>
          </div>
          <div class="p-6">
            {tripsActive.length === 0 ? (
              <p class="text-gray-500 text-center py-4">No active trips</p>
            ) : (
              <div class="space-y-3">
                {tripsActive.slice(0, 5).map((trip) => (
                  <div
                    key={trip.id}
                    class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div class="flex items-center space-x-3">
                      <Package class="h-5 w-5 text-green-500" />
                      <div>
                        <p class="font-medium text-gray-900">
                          {trip.clientName}
                        </p>
                        <p class="text-sm text-gray-500">
                          {trip.assignedCourier} • Safe {trip.assignedSafe}
                        </p>
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
                  <p class="text-sm text-gray-500 text-center pt-2">
                    +{tripsActive.length - 5} more trips
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Battery Safes */}
      {lowBattery.length > 0 && (
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-center space-x-2">
              <Battery class="h-5 w-5 text-yellow-500" />
              <h2 class="text-lg font-semibold text-gray-900">
                Low Battery Safes
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
                      <p class="text-sm text-gray-500">
                        Battery: {safe.batteryLevel}%
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={safe.status} type="safe" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Health */}
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">System Health</h2>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center">
              <div class="text-2xl font-bold text-green-600">
                {Math.round((stats.activeSafes / stats.totalSafes) * 100)}%
              </div>
              <p class="text-sm text-gray-500">Safes Online</p>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600">
                {stats.completedTripsToday}
              </div>
              <p class="text-sm text-gray-500">Trips Today</p>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-yellow-600">
                {Math.round(stats.averageBatteryLevel)}%
              </div>
              <p class="text-sm text-gray-500">Avg Battery</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
