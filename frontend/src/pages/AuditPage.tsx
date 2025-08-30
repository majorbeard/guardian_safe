import { useState, useEffect } from "preact/hooks";
import {
  FileText,
  Download,
  Filter,
  Search,
  Calendar,
  User,
  Activity,
} from "lucide-preact";
import { apiService } from "../services/api";
import Button from "../components/Button";
import Input from "../components/Input";
import type { AuditLog, UserRole } from "../types";
import { format, startOfDay, endOfDay } from "date-fns";

export default function AuditPage() {
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, actionFilter, roleFilter, dateFilter]);

  const loadAuditLogs = async () => {
    setLoading(true);

    const filters: any = {};
    if (actionFilter !== "all") filters.action = actionFilter;
    if (roleFilter !== "all") filters.userRole = roleFilter;
    if (dateFilter) {
      const date = new Date(dateFilter);
      filters.startDate = startOfDay(date);
      filters.endDate = endOfDay(date);
    }

    const response = await apiService.getAuditLogs(currentPage, 50, filters);

    if (response.success && response.data) {
      setAuditLogs(response.data.data);
      setTotalPages(Math.ceil(response.data.total / response.data.limit));
    }

    setLoading(false);
  };

  const filteredLogs = auditLogs.filter(
    (log) =>
      searchTerm === "" ||
      log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const LogDetailsModal = ({ log }: { log: AuditLog }) => (
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-gray-900">Audit Log Details</h2>
          <Button variant="ghost" onClick={() => setSelectedLog(null)}>
            ×
          </Button>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Log ID</label>
              <p class="text-sm font-mono text-gray-900">{log.id}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Timestamp</label>
              <p class="text-sm text-gray-900">
                {format(new Date(log.timestamp), "PPpp")}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">User ID</label>
              <p class="text-sm font-mono text-gray-900">{log.userId}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">User Role</label>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {log.userRole}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-500">Action</label>
              <p class="text-sm text-gray-900">{log.action}</p>
            </div>
            <div>
              <label class="text-sm font-medium text-gray-500">Resource</label>
              <p class="text-sm text-gray-900">{log.resource}</p>
            </div>
          </div>

          {log.resourceId && (
            <div>
              <label class="text-sm font-medium text-gray-500">
                Resource ID
              </label>
              <p class="text-sm font-mono text-gray-900">{log.resourceId}</p>
            </div>
          )}

          {log.ipAddress && (
            <div>
              <label class="text-sm font-medium text-gray-500">
                IP Address
              </label>
              <p class="text-sm font-mono text-gray-900">{log.ipAddress}</p>
            </div>
          )}

          <div>
            <label class="text-sm font-medium text-gray-500">Details</label>
            <div class="mt-1 bg-gray-50 rounded-lg p-3">
              <pre class="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const exportLogs = async () => {
    // In a real implementation, this would trigger a CSV/Excel download
    console.log("Exporting audit logs...");
  };

  if (loading && auditLogs.length === 0) {
    return (
      <div class="p-6">
        <div class="animate-pulse space-y-4">
          <div class="h-8 bg-gray-200 rounded w-1/4" />
          <div class="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const actionTypes = [
    "login",
    "logout",
    "create",
    "update",
    "delete",
    "unlock",
    "lock",
  ];

  return (
    <div class="p-6 space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p class="text-gray-600">System activity and security audit trail</p>
        </div>
        <Button variant="secondary" onClick={exportLogs}>
          <Download class="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Summary Stats */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <FileText class="h-8 w-8 text-blue-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Total Logs</p>
              <p class="text-2xl font-bold text-gray-900">{auditLogs.length}</p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <User class="h-8 w-8 text-green-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Unique Users</p>
              <p class="text-2xl font-bold text-gray-900">
                {new Set(auditLogs.map((log) => log.userId)).size}
              </p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Activity class="h-8 w-8 text-purple-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Actions Today</p>
              <p class="text-2xl font-bold text-gray-900">
                {
                  auditLogs.filter((log) => {
                    const logDate = new Date(log.timestamp);
                    const today = new Date();
                    return logDate.toDateString() === today.toDateString();
                  }).length
                }
              </p>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center">
            <Calendar class="h-8 w-8 text-orange-500" />
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-500">Date Range</p>
              <p class="text-sm text-gray-900">
                {auditLogs.length > 0
                  ? format(
                      new Date(auditLogs[auditLogs.length - 1].timestamp),
                      "MMM d"
                    )
                  : "-"}
                {" to "}
                {auditLogs.length > 0
                  ? format(new Date(auditLogs[0].timestamp), "MMM d")
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div class="bg-white rounded-lg shadow p-4 space-y-4">
        <div class="flex items-center space-x-2 mb-4">
          <Filter class="h-4 w-4 text-gray-400" />
          <span class="text-sm font-medium text-gray-700">
            Filters & Search
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onInput={(e) =>
                setSearchTerm((e.target as HTMLInputElement).value)
              }
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) =>
              setActionFilter((e.target as HTMLSelectElement).value)
            }
            class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Actions</option>
            {actionTypes.map((action) => (
              <option key={action} value={action} class="capitalize">
                {action}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) =>
              setRoleFilter(
                (e.target as HTMLSelectElement).value as UserRole | "all"
              )
            }
            class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="courier">Courier</option>
            <option value="auditor">Auditor</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) =>
              setDateFilter((e.target as HTMLInputElement).value)
            }
            class="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div class="bg-white rounded-lg shadow">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">
            {filteredLogs.length} Log{filteredLogs.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {filteredLogs.length === 0 ? (
          <div class="p-8 text-center">
            <FileText class="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    class="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="text-sm text-gray-900">{log.userId}</div>
                        <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {log.userRole}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {log.action}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{log.resource}</div>
                      {log.resourceId && (
                        <div class="text-xs text-gray-500 font-mono">
                          {log.resourceId}
                        </div>
                      )}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {log.ipAddress || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div class="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div class="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div class="flex space-x-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedLog && <LogDetailsModal log={selectedLog} />}
    </div>
  );
}
