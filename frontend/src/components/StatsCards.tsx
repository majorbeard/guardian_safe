import { Shield, Package, Activity, TrendingUp } from "lucide-preact";

interface StatsCardsProps {
  stats: {
    totalSafes: number;
    activeSafes: number;
    totalTrips: number;
    activeTrips: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: "Total Safes", value: stats.totalSafes, icon: Shield },
    {
      label: "Active Safes",
      value: stats.activeSafes,
      icon: Activity,
      active: true,
    },
    { label: "Total Trips", value: stats.totalTrips, icon: Package },
    {
      label: "In Transit",
      value: stats.activeTrips,
      icon: TrendingUp,
      active: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors duration-200 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <h3 className="mt-2 text-3xl font-medium text-gray-900 tracking-tight">
                {card.value}
              </h3>
            </div>
            <div
              className={`p-2 rounded-md ${
                card.active
                  ? "bg-brand-light text-brand"
                  : "bg-gray-50 text-gray-400"
              }`}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
