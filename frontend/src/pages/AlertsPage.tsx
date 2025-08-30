import { useState } from "preact/hooks";
import { Bell, Check, X, AlertTriangle, Filter } from "lucide-preact";
import { alerts } from "../store/realtime";
import { realtimeActions } from "../store/realtime";
import Button from "../components/Button";
import AlertBanner from "../components/AlertBanner";
import type { Alert } from "../types";

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<
    "all" | "critical" | "high" | "medium" | "low"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "acknowledged"
  >("all");

  const alertsList = alerts.value;

  const filteredAlerts = alertsList.filter((alert) => {
    const matchesSeverity =
      severityFilter === "all" || alert.severity === severityFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !alert.acknowledged) ||
      (statusFilter === "acknowledged" && alert.acknowledged);

    return matchesSeverity && matchesStatus;
  });

  const handleAcknowledgeAlert = (alertId: string) => {
    realtimeActions.acknowledgeAlert(alertId);
  };

  const handleAcknowledgeAll = () => {
    const unacknowledgedAlerts = alertsList.filter(
      (alert) => !alert.acknowledged
    );
    unacknowledgedAlerts.forEach((alert) => {
      realtimeActions.acknowledgeAlert(alert.id);
    });
  };

  const handleClearAcknowledged = () => {
    realtimeActions.clearAlerts();
  };

  const criticalAlerts = alertsList.filter(
    (alert) => !alert.acknowledged && alert.severity === "critical"
  );
  const highAlerts = alertsList.filter(
    (alert) => !alert.acknowledged && alert.severity === "high"
  );
  const unacknowledgedCount = alertsList.filter(
    (alert) => !alert.acknowledged
  ).length;

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">System Alerts</h1>
          <p class="text-gray-600">Monitor and manage system notifications</p>
        </div>
        <div class="flex items-center space-x-3">
          {unacknowledgedCount > 0 && (
            <Button variant="secondary" onClick={handleAcknowledgeAll}>
              <Check class="h-4 w-4 mr-2" />
              Acknowledge All ({unacknowledgedCount})
            </Button>
          )}
          <Button variant="ghost" onClick={handleClearAcknowledged}>
            <X class="h-4 w-4 mr-2" />
            Clear Acknowledged
          </Button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <div class="p-2 bg-red-100 rounded-lg">
              <AlertTriangle class="h-6 w-6 text-red-600" />
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Critical Alerts</p>
              <p class="text-2xl font-bold text-red-600">
                {criticalAlerts.length}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <div class="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle class="h-6 w-6 text-orange-600" />
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">High Priority</p>
              <p class="text-2xl font-bold text-orange-600">
                {highAlerts.length}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <div class="p-2 bg-yellow-100 rounded-lg">
              <Bell class="h-6 w-6 text-yellow-600" />
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Active</p>
              <p class="text-2xl font-bold text-gray-900">
                {unacknowledgedCount}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <div class="p-2 bg-gray-100 rounded-lg">
              <Bell class="h-6 w-6 text-gray-600" />
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Alerts</p>
              <p class="text-2xl font-bold text-gray-900">
                {alertsList.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center space-x-6">
          <div class="flex items-center space-x-2">
            <Filter class="h-4 w-4 text-gray-400" />
            <span class="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <div class="flex items-center space-x-2">
            <label class="text-sm text-gray-600">Severity:</label>
            <select
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter((e.target as HTMLSelectElement).value as any)
              }
              class="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div class="flex items-center space-x-2">
            <label class="text-sm text-gray-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter((e.target as HTMLSelectElement).value as any)
              }
              class="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Alerts</option>
              <option value="active">Active Only</option>
              <option value="acknowledged">Acknowledged Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Critical Alerts Section */}
      {criticalAlerts.length > 0 && (
        <div class="space-y-4">
          <div class="flex items-center space-x-2">
            <AlertTriangle class="h-5 w-5 text-red-500" />
            <h2 class="text-lg font-semibold text-red-700">
              Critical Alerts Requiring Immediate Attention
            </h2>
          </div>
          <div class="space-y-3">
            {criticalAlerts.map((alert) => (
              <AlertBanner
                key={alert.id}
                alert={alert}
                onDismiss={() => handleAcknowledgeAlert(alert.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Alerts List */}
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">
            {filteredAlerts.length} Alert
            {filteredAlerts.length !== 1 ? "s" : ""}
            {severityFilter !== "all" && ` (${severityFilter} severity)`}
            {statusFilter !== "all" && ` (${statusFilter})`}
          </h2>
        </div>

        {filteredAlerts.length === 0 ? (
          <div class="p-8 text-center">
            <Bell class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">No alerts found matching your criteria</p>
            {alertsList.length === 0 && (
              <p class="text-sm text-gray-400 mt-2">
                All systems are operating normally
              </p>
            )}
          </div>
        ) : (
          <div class="divide-y divide-gray-200">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                class={`p-4 transition-colors ${
                  alert.acknowledged
                    ? "bg-gray-50 opacity-75"
                    : "hover:bg-gray-50"
                }`}
              >
                <AlertBanner
                  alert={alert}
                  onDismiss={
                    alert.acknowledged
                      ? undefined
                      : () => handleAcknowledgeAlert(alert.id)
                  }
                />

                {alert.acknowledged && (
                  <div class="mt-2 text-xs text-gray-500 flex items-center">
                    <Check class="h-3 w-3 mr-1" />
                    Acknowledged
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Legend */}
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="text-sm font-medium text-gray-700 mb-3">
          Alert Types & Severity Levels
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 class="text-sm font-medium text-gray-600 mb-2">Alert Types:</h4>
            <div class="space-y-1 text-sm text-gray-600">
              <p>
                • <strong>Tamper:</strong> Physical tampering detected
              </p>
              <p>
                • <strong>Battery Low:</strong> Battery level below threshold
              </p>
              <p>
                • <strong>Offline:</strong> Safe lost communication
              </p>
              <p>
                • <strong>Emergency:</strong> Manual emergency alert
              </p>
            </div>
          </div>
          <div>
            <h4 class="text-sm font-medium text-gray-600 mb-2">
              Severity Levels:
            </h4>
            <div class="space-y-1 text-sm">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>
                  <strong>Critical:</strong> Immediate action required
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>
                  <strong>High:</strong> Action required within hours
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>
                  <strong>Medium:</strong> Action required within day
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>
                  <strong>Low:</strong> Informational
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
