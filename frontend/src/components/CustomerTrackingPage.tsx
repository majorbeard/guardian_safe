import { useState, useEffect } from "preact/hooks";
import {
  Shield,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  AlertCircle,
  Lock,
} from "lucide-preact";
import { dataService } from "../services/data";
import { LoadingSpinner } from "./LoadingSpinner";
import { format, isToday, isPast } from "date-fns";

interface CustomerTrackingPageProps {
  trackingToken: string;
}

interface TripTrackingData {
  id: string;
  client_name: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  scheduled_pickup: string;
  scheduled_delivery: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
  priority?: string;
  special_instructions?: string;
  requires_signature?: boolean;
  created_at: string;
  updated_at: string;
  safes: {
    serial_number: string;
    status: string;
    battery_level: number;
    last_update: string;
  };
}

export function CustomerTrackingPage({
  trackingToken,
}: CustomerTrackingPageProps) {
  const [trip, setTrip] = useState<TripTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadTripData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadTripData(false); // Don't show loading spinner on refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [trackingToken]);

  const loadTripData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const result = await dataService.getTripByTrackingToken(trackingToken);

      if (result.success && result.trip) {
        setTrip(result.trip as unknown as TripTrackingData);
        setLastUpdate(new Date());
      } else {
        setError(
          result.error || "Secure transport not found or tracking not enabled"
        );
      }
    } catch (err) {
      setError("Unable to load tracking information. Please try again.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          color: "bg-blue-100 text-blue-800",
          icon: Clock,
          label: "Secure Transport Scheduled",
          description:
            "Your valuable items are scheduled for secure collection",
        };
      case "in_transit":
        return {
          color: "bg-yellow-100 text-yellow-800",
          icon: Package,
          label: "Secure Transport In Progress",
          description: "Your items are in secure transit with armed monitoring",
        };
      case "delivered":
        return {
          color: "bg-green-100 text-green-800",
          icon: CheckCircle,
          label: "Secure Delivery Complete",
          description: "Your items have been safely delivered",
        };
      case "cancelled":
        return {
          color: "bg-gray-100 text-gray-800",
          icon: AlertCircle,
          label: "Transport Cancelled",
          description: "This secure transport has been cancelled",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          icon: Package,
          label: "Status Unknown",
          description: "",
        };
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "URGENT";
      case "high":
        return "HIGH PRIORITY";
      case "normal":
        return "STANDARD";
      case "low":
        return "STANDARD";
      default:
        return "STANDARD";
    }
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    if (isToday(date)) {
      return `Today at ${format(date, "HH:mm")}`;
    }
    return format(date, "MMM d, yyyy 'at' HH:mm");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center px-4">
        <div className="text-center">
          <LoadingSpinner size="large" className="mb-4" />
          <p className="text-gray-300">
            Loading secure transport information...
          </p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <p className="text-sm text-gray-400">
            If you believe this is an error, please contact Guardian Safe
            Security Services.
          </p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(trip.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-gray-600">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 rounded-lg p-3">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Guardian Safe</h1>
              <p className="text-blue-200">Secure Transport Tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div
                className={`p-3 rounded-lg ${statusInfo.color.replace(
                  "text-",
                  "text-white bg-"
                )}`}
              >
                <StatusIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {statusInfo.label}
                </h2>
                <p className="text-gray-300">{statusInfo.description}</p>
              </div>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
              >
                {trip.status.replace("_", " ").toUpperCase()}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                Priority: {getPriorityLabel(trip.priority)}
              </p>
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">Transport Details</h3>
            <p className="text-gray-300">Client: {trip.client_name}</p>
            <p className="text-xs text-gray-400 mt-2">
              Transport ID: {trip.id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Transport Timeline
          </h3>

          <div className="space-y-6">
            {/* Pickup */}
            <div className="flex items-start space-x-4">
              <div
                className={`p-2 rounded-lg ${
                  trip.actual_pickup_time
                    ? "bg-green-600"
                    : isPast(new Date(trip.scheduled_pickup)) &&
                      trip.status !== "pending"
                    ? "bg-green-600"
                    : "bg-gray-600"
                }`}
              >
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Secure Collection</h4>
                  {trip.actual_pickup_time && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      COMPLETED
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  {trip.pickup_address}
                </p>
                <div className="text-xs text-gray-400 mt-2">
                  <p>Scheduled: {formatTime(trip.scheduled_pickup)}</p>
                  {trip.actual_pickup_time && (
                    <p>Collected: {formatTime(trip.actual_pickup_time)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* In Transit */}
            {(trip.status === "in_transit" || trip.status === "delivered") && (
              <div className="flex items-start space-x-4">
                <div className="p-2 rounded-lg bg-yellow-600">
                  <Lock className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white">Secure Transit</h4>
                  <p className="text-sm text-gray-300 mt-1">
                    Items secured and monitored
                  </p>
                  <div className="text-xs text-gray-400 mt-2 flex items-center space-x-4">
                    <span>Safe: {trip.safes.serial_number}</span>
                    <span>Battery: {trip.safes.battery_level}%</span>
                    <span>Status: {trip.safes.status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery */}
            <div className="flex items-start space-x-4">
              <div
                className={`p-2 rounded-lg ${
                  trip.actual_delivery_time ? "bg-green-600" : "bg-gray-600"
                }`}
              >
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Secure Delivery</h4>
                  {trip.actual_delivery_time && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      DELIVERED
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  {trip.delivery_address}
                </p>
                <div className="text-xs text-gray-400 mt-2">
                  <p>Scheduled: {formatTime(trip.scheduled_delivery)}</p>
                  {trip.actual_delivery_time && (
                    <p>Delivered: {formatTime(trip.actual_delivery_time)}</p>
                  )}
                </div>
                {trip.requires_signature && (
                  <p className="text-xs text-blue-300 mt-1">
                    ⚠️ Signature required upon delivery
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {trip.special_instructions && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-bold text-white mb-4">
              Security Instructions
            </h3>
            <p className="text-gray-300">{trip.special_instructions}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p className="mb-2">
            Last updated: {format(lastUpdate, "MMM d, yyyy 'at' HH:mm:ss")}
          </p>
          <p>Guardian Safe Security Services - Premium Secure Transport</p>
        </div>
      </div>
    </div>
  );
}
