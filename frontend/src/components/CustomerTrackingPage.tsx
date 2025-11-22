import { useState, useEffect, useRef } from "preact/hooks";
import {
  Shield,
  // MapPin,
  // Clock,
  Package,
  // CheckCircle,
  AlertCircle,
  // Navigation,
  RefreshCw,
} from "lucide-preact";
import { dataService } from "../services/data";
import { trackneticsService } from "../services/tracknetics";
import { LoadingSpinner } from "./LoadingSpinner";
import { format } from "date-fns";
import L from "leaflet";
import {
  fixLeafletIcons,
  createArrowIcon,
  getOpenStreetMapLayer,
} from "../utils/leafletHelpers";

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
    id: string;
    serial_number: string;
    status: string;
    battery_level: number;
    last_update: string;
    tracknetics_device_id?: string;
    tracking_device_id?: string;
  };
}

interface SafeLocationData {
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    speed?: number;
  };
  status: "online" | "offline" | "no_tracker" | "error";
  error?: string;
  lastUpdate: Date;
}

export function CustomerTrackingPage({
  trackingToken,
}: CustomerTrackingPageProps) {
  const [trip, setTrip] = useState<TripTrackingData | null>(null);
  const [safeLocation, setSafeLocation] = useState<SafeLocationData>({
    status: "offline",
    lastUpdate: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh] = useState(true);

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const safeMarkerRef = useRef<L.Marker | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState<string>("");

  // Load trip data
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

  // Initialize map
  const initializeMap = () => {
    if (!mapRef.current || leafletMapRef.current || mapsError) return;

    try {
      fixLeafletIcons();

      // Wait for DOM to fully render
      setTimeout(() => {
        if (!mapRef.current) return;

        const map = L.map(mapRef.current, {
          center: [-26.2041, 28.0473],
          zoom: 13,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        getOpenStreetMapLayer().addTo(map);

        leafletMapRef.current = map;

        // Force size recalculation
        setTimeout(() => {
          if (leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
          }
        }, 250);

        setMapsLoaded(true);
        // Update marker if location exists
        if (safeLocation.location) {
          setTimeout(() => updateSafeMarker(), 500);
        }
      }, 100);
    } catch (error) {
      console.error("Error initializing customer map:", error);
      setMapsError("Failed to initialize map");
    }
  };

  // Update safe location
  const updateSafeLocation = async () => {
    if (!trip?.safes) return;

    const deviceId =
      trip.safes.tracknetics_device_id || trip.safes.tracking_device_id;
    if (!deviceId) {
      setSafeLocation({
        status: "no_tracker",
        error: "No tracking device available",
        lastUpdate: new Date(),
      });
      return;
    }

    setLocationLoading(true);

    try {
      const locationPromise =
        trackneticsService.getLocationByDeviceId(deviceId);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Location timeout")), 10000)
      );

      const result = await Promise.race([
        locationPromise,
        timeoutPromise,
      ]).catch((err): { success: false; error: string } => {
        console.warn("Location fetch timeout:", err);
        return { success: false, error: "Location request timed out" };
      });

      if (result.success && result.location) {
        const newLocation: SafeLocationData = {
          location: result.location,
          status: "online",
          lastUpdate: new Date(),
        };
        setSafeLocation(newLocation);
      } else {
        setSafeLocation({
          status: "offline",
          error: result.error || "No current location",
          lastUpdate: new Date(),
        });
      }
    } catch (error: any) {
      setSafeLocation({
        status: "error",
        error: error.message || "Failed to get location",
        lastUpdate: new Date(),
      });
    } finally {
      setLocationLoading(false);
    }
  };

  // Update safe marker on map
  const updateSafeMarker = () => {
    if (!leafletMapRef.current) {
      return;
    }

    if (!safeLocation.location) {
      return;
    }

    const position: L.LatLngExpression = [
      safeLocation.location.lat,
      safeLocation.location.lng,
    ];

    try {
      if (!safeMarkerRef.current) {
        // Create safe marker
        const icon =
          safeLocation.location.speed && safeLocation.location.speed > 5
            ? createArrowIcon("#8B5CF6", 0)
            : L.divIcon({
                className: "custom-transport-marker",
                html: `<div style="
                background-color: #8B5CF6;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                border: 4px solid white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
              "></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              });

        safeMarkerRef.current = L.marker(position, { icon }).addTo(
          leafletMapRef.current
        );

        // Safe info window
        const popupContent = `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; color: #8B5CF6;">🚚 Your Secure Transport</h3>
            <div style="font-size: 12px;">
              <p style="margin: 2px 0;"><strong>Status:</strong> ${
                safeLocation.status
              }</p>
              <p style="margin: 2px 0;"><strong>Location:</strong> ${position[0].toFixed(
                6
              )}, ${position[1].toFixed(6)}</p>
              <p style="margin: 2px 0;"><strong>Accuracy:</strong> ±${
                safeLocation.location.accuracy
              }m</p>
              ${
                safeLocation.location.speed
                  ? `<p style="margin: 2px 0;"><strong>Speed:</strong> ${safeLocation.location.speed} km/h</p>`
                  : ""
              }
              <p style="margin: 2px 0;"><strong>Last Update:</strong> Just now</p>
            </div>
          </div>
        `;

        safeMarkerRef.current.bindPopup(popupContent);

        // Center map on safe location
        leafletMapRef.current.setView(position, 15);
      } else {
        // Update existing marker position
        safeMarkerRef.current.setLatLng(position);
        leafletMapRef.current.setView(
          position,
          leafletMapRef.current.getZoom()
        );
      }
    } catch (error) {
      console.error("Error updating safe marker:", error);
    }
  };

  // Initialize everything
  useEffect(() => {
    loadTripData();
    initializeMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [trackingToken]);

  // Update safe marker when location changes
  useEffect(() => {
    if (mapsLoaded && safeLocation.location && !mapsError) {
      updateSafeMarker();
    }
  }, [safeLocation, mapsLoaded, mapsError]);

  // Auto-refresh logic
  useEffect(() => {
    if (trip) {
      updateSafeLocation(); // Initial load

      if (autoRefresh && trip.status === "in_transit") {
        const interval = setInterval(() => {
          loadTripData(false); // Refresh trip data
          updateSafeLocation(); // Refresh location
        }, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [trip, autoRefresh]);

  // Helper functions
  /*   const getStatusInfo = (status: string) => {
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
          description:
            "Your items are in secure transit with live GPS monitoring",
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
  }; */

  /*   const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "URGENT";
      case "high":
        return "HIGH PRIORITY";
      default:
        return "STANDARD";
    }
  }; */

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
        </div>
      </div>
    );
  }

  // const statusInfo = getStatusInfo(trip.status);
  // const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-200 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-brand rounded p-1.5">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-medium text-gray-900 tracking-tight">
              Kluys Tracking
            </span>
          </div>
          {trip?.status === "in_transit" && (
            <div className="badge badge-brand animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-brand mr-1.5"></span>
              Live
            </div>
          )}
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        {/* Map Container - Takes dominance */}
        <div className="flex-1 relative min-h-[50vh] bg-gray-100 order-2 lg:order-1">
          <div ref={mapRef} className="absolute inset-0 z-0" />

          {/* Floating Map Controls (Example) */}
          <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-2">
            <button
              onClick={updateSafeLocation}
              className="bg-white p-2.5 rounded-md shadow-lg border border-gray-200 text-gray-600 hover:text-brand transition-colors"
            >
              <RefreshCw
                className={`h-5 w-5 ${locationLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Status Sidebar / Bottom Sheet */}
        <div className="bg-white border-t lg:border-t-0 lg:border-l border-gray-200 w-full lg:w-96 p-6 z-10 shadow-lg flex flex-col gap-6 order-1 lg:order-2 overflow-y-auto max-h-[50vh] lg:max-h-screen">
          {/* Status Timeline */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Transport Status
            </h2>
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`p-2 rounded-full ${
                  trip?.status === "in_transit"
                    ? "bg-brand-light text-brand"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 capitalize">
                  {trip?.status.replace("_", " ")}
                </h3>
                <p className="text-sm text-gray-500">
                  {trip?.status === "in_transit"
                    ? "Arriving shortly"
                    : "Scheduled"}
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Locations */}
          <div className="relative pl-4 border-l-2 border-gray-100 space-y-8 my-2">
            <div className="relative">
              <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-gray-400 ring-1 ring-gray-200"></div>
              <p className="text-xs text-gray-500 mb-1">From</p>
              <p className="text-sm font-medium text-gray-900">
                {trip?.pickup_address}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {format(new Date(trip?.scheduled_pickup || ""), "MMM d, HH:mm")}
              </p>
            </div>
            <div className="relative">
              <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand ring-1 ring-brand/30"></div>
              <p className="text-xs text-gray-500 mb-1">To</p>
              <p className="text-sm font-medium text-gray-900">
                {trip?.delivery_address}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {format(
                  new Date(trip?.scheduled_delivery || ""),
                  "MMM d, HH:mm"
                )}
              </p>
            </div>
          </div>

          {trip?.special_instructions && (
            <div className="bg-gray-50 rounded-md p-3 border border-gray-200 mt-auto">
              <div className="flex items-center gap-2 text-gray-900 font-medium text-sm mb-1">
                <Shield className="h-3 w-3" /> Security Note
              </div>
              <p className="text-xs text-gray-600">
                {trip.special_instructions}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
