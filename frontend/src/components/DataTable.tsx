import { useState } from "preact/hooks";
import {
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  ArrowLeft,
  ArrowRight,
} from "lucide-preact";
import Button from "./Button";
import { clsx } from "clsx";

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => preact.ComponentChildren;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (item: T) => void;
  className?: string;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = false,
  filterable = false,
  pagination,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const sortedAndFilteredData = data
    .filter((item) => {
      if (!searchTerm) return true;
      return Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;

      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <div class="bg-white rounded-lg shadow">
        <div class="animate-pulse">
          <div class="h-16 bg-gray-200 rounded-t-lg" />
          <div class="space-y-3 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} class="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class={clsx("bg-white rounded-lg shadow", className)}>
      {/* Header with search and filters */}
      {(searchable || filterable) && (
        <div class="p-4 border-b border-gray-200">
          <div class="flex items-center justify-between space-x-4">
            {searchable && (
              <div class="flex-1 relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onInput={(e) =>
                    setSearchTerm((e.target as HTMLInputElement).value)
                  }
                  class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {filterable && (
              <Button
                variant="secondary"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter class="h-4 w-4 mr-2" />
                Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  class={clsx(
                    "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                    column.sortable && "cursor-pointer hover:bg-gray-100",
                    column.className
                  )}
                  onClick={() =>
                    column.sortable && handleSort(String(column.key))
                  }
                >
                  <div class="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div class="flex flex-col">
                        <ChevronUp
                          class={clsx(
                            "h-3 w-3 -mb-1",
                            sortColumn === String(column.key) &&
                              sortDirection === "asc"
                              ? "text-blue-500"
                              : "text-gray-400"
                          )}
                        />
                        <ChevronDown
                          class={clsx(
                            "h-3 w-3",
                            sortColumn === String(column.key) &&
                              sortDirection === "desc"
                              ? "text-blue-500"
                              : "text-gray-400"
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {sortedAndFilteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  class="px-6 py-12 text-center text-gray-500"
                >
                  No data found
                </td>
              </tr>
            ) : (
              sortedAndFilteredData.map((item, index) => (
                <tr
                  key={index}
                  class={clsx(
                    "hover:bg-gray-50 transition-colors",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      class={clsx(
                        "px-6 py-4 whitespace-nowrap",
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(item)
                        : String(item[column.key] || "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div class="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div class="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div class="flex space-x-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ArrowLeft class="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <ArrowRight class="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
