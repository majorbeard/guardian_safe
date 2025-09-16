import { MapPin, Calendar, Clock, AlertTriangle, User } from "lucide-preact";
import { format } from "date-fns";

interface TripCardProps {
  trip: {
    id: string;
    client_name: string;
    pickup_address: string;
    delivery_address: string;
    status: string;
    scheduled_pickup: string;
    scheduled_delivery: string;
    special_instructions?: string;
    priority?: string;
    requires_signature?: boolean;
  };
  onStartTrip?: () => void;
  onViewDetails?: () => void;
}

export function TripCard({ trip, onStartTrip, onViewDetails }: TripCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "in_transit":
        return "bg-yellow-100 text-yellow-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "normal":
        return "text-blue-600";
      case "low":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const isOverdue =
    new Date(trip.scheduled_pickup) < new Date() && trip.status === "pending";

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {trip.client_name}
              </h3>
              <p className="text-sm text-gray-500">
                ID: {trip.id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                trip.status
              )}`}
            >
              {trip.status.replace("_", " ").toUpperCase()}
            </span>
            {trip.priority && trip.priority !== "normal" && (
              <p
                className={`text-xs font-medium mt-1 ${getPriorityColor(
                  trip.priority
                )}`}
              >
                {trip.priority.toUpperCase()} PRIORITY
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              OVERDUE - Scheduled pickup passed
            </span>
          </div>
        </div>
      )}

      {/* Trip Details */}
      <div className="p-4 space-y-4">
        {/* Pickup */}
        <div className="flex items-start space-x-3">
          <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Pickup</p>
            <p className="text-sm text-gray-600">{trip.pickup_address}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {format(new Date(trip.scheduled_pickup), "MMM d, yyyy")}
              </span>
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {format(new Date(trip.scheduled_pickup), "HH:mm")}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery */}
        <div className="flex items-start space-x-3">
          <MapPin className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Delivery</p>
            <p className="text-sm text-gray-600">{trip.delivery_address}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {format(new Date(trip.scheduled_delivery), "MMM d, yyyy")}
              </span>
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {format(new Date(trip.scheduled_delivery), "HH:mm")}
              </span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {trip.special_instructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-medium text-yellow-800 mb-1">
              Special Instructions:
            </p>
            <p className="text-sm text-yellow-700">
              {trip.special_instructions}
            </p>
          </div>
        )}

        {/* Requirements */}
        {trip.requires_signature && (
          <div className="flex items-center space-x-2 text-blue-700 bg-blue-50 px-3 py-2 rounded">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Signature required upon delivery
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 border-t space-y-2">
        {trip.status === "pending" && onStartTrip && (
          <button
            onClick={onStartTrip}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Start Trip
          </button>
        )}

        {trip.status === "in_transit" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
            <p className="text-yellow-800 font-medium">Trip In Progress</p>
            <p className="text-yellow-700 text-sm">
              Proceed to delivery location
            </p>
          </div>
        )}

        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
