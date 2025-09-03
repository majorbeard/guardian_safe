interface StatsCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down";
  };
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "indigo";
  loading?: boolean;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  icon: IconComponent,
  trend,
  color = "blue",
  loading = false,
  onClick,
}: StatsCardProps) {
  const colorClasses = {
    blue: "bg-blue-500 text-white",
    green: "bg-green-500 text-white",
    yellow: "bg-yellow-500 text-white",
    red: "bg-red-500 text-white",
    purple: "bg-purple-500 text-white",
    indigo: "bg-indigo-500 text-white",
  };

  if (loading) {
    return (
      <div class="bg-white rounded-lg shadow p-6 animate-pulse">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-gray-200 rounded-lg" />
          <div class="ml-4 flex-1">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div class="h-6 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      class={`bg-white rounded-lg shadow p-6 transition-all hover:shadow-lg ${
        onClick ? "cursor-pointer hover:scale-105" : ""
      }`}
      onClick={onClick}
    >
      <div class="flex items-center">
        <div class={`p-3 rounded-lg ${colorClasses[color]}`}>
          <IconComponent class="h-6 w-6" />
        </div>
        <div class="ml-4 flex-1">
          <p class="text-sm font-medium text-gray-500">{title}</p>
          <div class="flex items-baseline">
            <p class="text-2xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <div
                class={`ml-2 flex items-center text-sm ${
                  trend.direction === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                <span class="font-medium">
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span class="ml-1 text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
