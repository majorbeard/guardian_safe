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
    {
      title: "Total Safes",
      value: stats.totalSafes,
      icon: Shield,
      color: "bg-blue-500",
    },
    {
      title: "Active Safes",
      value: stats.activeSafes,
      icon: Activity,
      color: "bg-green-500",
    },
    {
      title: "Total Trips",
      value: stats.totalTrips,
      icon: Package,
      color: "bg-purple-500",
    },
    {
      title: "Active Trips",
      value: stats.activeTrips,
      icon: TrendingUp,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div key={card.title} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {card.title}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
