import { useState, useEffect } from "preact/hooks";
import {
  Calendar,
  User,
  MapPin,
  Package,
  FileText,
  Filter,
} from "lucide-preact";
import { supabase } from "../lib/supabase";
import { LoadingSpinner } from "./LoadingSpinner";
import { format } from "date-fns";
import { isOwner } from "../store/auth";

interface TripLog {
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
  cancellation_reason?: string;
  delivery_notes?: string;
  created_by: string;
  created_at: string;
  safes: {
    serial_number: string;
  };
}

export function TripHistoryPage() {
  const [trips, setTrips] = useState<TripLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "delivered" | "cancelled">(
    "all"
  );
  const owner = isOwner.value;

  useEffect(() => {
    loadTripHistory();
  }, [filter]);

  const loadTripHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("trips")
        .select(
          `
        id,
        client_name,
        pickup_address,
        delivery_address,
        status,
        scheduled_pickup,
        scheduled_delivery,
        actual_pickup_time,
        actual_delivery_time,
        priority,
        cancellation_reason,
        delivery_notes,
        created_by,
        created_at,
        safes!inner(serial_number)
      `
        )
        .in("status", filter === "all" ? ["delivered", "cancelled"] : [filter])
        .order("created_at", { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;

      const transformedData = (data || []).map((trip: any) => ({
        ...trip,
        safes: Array.isArray(trip.safes) ? trip.safes[0] : trip.safes,
      }));

      setTrips(transformedData);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Trip History</h2>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            className="input w-48"
            value={filter}
            onChange={(e) =>
              setFilter((e.target as HTMLSelectElement).value as any)
            }
          >
            <option value="all">All Completed</option>
            <option value="delivered">Delivered Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No trip history found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div key={trip.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      trip.status === "delivered"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {trip.client_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Safe: {trip.safes.serial_number}
                    </p>
                  </div>
                </div>
                <span
                  className={`badge ${
                    trip.status === "delivered"
                      ? "badge-success"
                      : "badge-neutral"
                  }`}
                >
                  {trip.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Pickup</p>
                    <p className="text-gray-600">{trip.pickup_address}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Scheduled:{" "}
                      {format(new Date(trip.scheduled_pickup), "MMM d, HH:mm")}
                    </p>
                    {trip.actual_pickup_time && (
                      <p className="text-xs text-gray-400">
                        Actual:{" "}
                        {format(
                          new Date(trip.actual_pickup_time),
                          "MMM d, HH:mm"
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Delivery</p>
                    <p className="text-gray-600">{trip.delivery_address}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Scheduled:{" "}
                      {format(
                        new Date(trip.scheduled_delivery),
                        "MMM d, HH:mm"
                      )}
                    </p>
                    {trip.actual_delivery_time && (
                      <p className="text-xs text-gray-400">
                        Actual:{" "}
                        {format(
                          new Date(trip.actual_delivery_time),
                          "MMM d, HH:mm"
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {trip.delivery_notes && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <FileText className="h-4 w-4" />
                    Driver Notes
                  </div>
                  <p className="text-sm text-gray-600">{trip.delivery_notes}</p>
                </div>
              )}

              {trip.cancellation_reason && (
                <div className="bg-red-50 rounded-lg p-3 border border-red-200 mb-4">
                  <p className="text-sm font-medium text-red-700 mb-1">
                    Cancellation Reason:
                  </p>
                  <p className="text-sm text-red-600">
                    {trip.cancellation_reason}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(trip.created_at), "MMM d, yyyy")}
                </div>
                {owner && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    ID: {trip.created_by.slice(0, 8)}
                  </div>
                )}
                {trip.priority && trip.priority !== "normal" && (
                  <span className="badge badge-brand text-xs">
                    {trip.priority.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
