import {
  // MapPin,
  Calendar,
  // Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-preact";
import { format, isPast } from "date-fns";

interface TripCardProps {
  trip: {
    id: string;
    client_name: string;
    pickup_address: string;
    delivery_address: string;
    status: string;
    scheduled_pickup: string;
    scheduled_delivery: string;
    priority?: string;
  };
  onStartTrip?: () => void;
  onViewDetails?: () => void;
  variant?: "default" | "active";
}

export function TripCard({
  trip,
  onStartTrip,
  onViewDetails,
  variant = "default",
}: TripCardProps) {
  const isOverdue =
    isPast(new Date(trip.scheduled_pickup)) && trip.status === "pending";
  const isHighPriority = trip.priority === "high" || trip.priority === "urgent";

  if (variant === "active") {
    return (
      <div className="bg-brand text-white rounded-xl p-5 shadow-lg shadow-brand/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider backdrop-blur-sm">
              In Progress
            </span>
            <span className="text-white/80 font-mono text-xs">
              #{trip.id.slice(-4)}
            </span>
          </div>

          <h3 className="text-xl font-bold mb-1 truncate">
            {trip.client_name}
          </h3>
          <p className="text-white/90 text-sm mb-6 line-clamp-2">
            {trip.delivery_address}
          </p>

          <button className="w-full bg-white text-brand font-bold py-3 rounded-lg shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onViewDetails}
      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm active:bg-gray-50 transition-colors relative overflow-hidden"
    >
      {/* Priority Stripe */}
      {isHighPriority && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
      )}

      <div className="flex justify-between items-start mb-3 pl-2">
        <div>
          <h3 className="font-semibold text-gray-900">{trip.client_name}</h3>
          {isOverdue && (
            <div className="flex items-center gap-1 text-red-600 text-xs font-medium mt-0.5">
              <AlertTriangle className="h-3 w-3" /> Overdue
            </div>
          )}
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-gray-400">
            #{trip.id.slice(-4)}
          </span>
        </div>
      </div>

      <div className="space-y-2 pl-2 mb-4">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0"></div>
          <p className="text-xs text-gray-500 line-clamp-1">
            {trip.pickup_address}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0"></div>
          <p className="text-xs text-gray-900 font-medium line-clamp-1">
            {trip.delivery_address}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pl-2 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5" />
          {format(new Date(trip.scheduled_pickup), "MMM d, HH:mm")}
        </div>

        {onStartTrip && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartTrip();
            }}
            className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-sm hover:bg-gray-800 transition-colors"
          >
            Start Trip
          </button>
        )}
      </div>
    </div>
  );
}
