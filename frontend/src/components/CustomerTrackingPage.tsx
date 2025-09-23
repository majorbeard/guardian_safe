import { useState, useEffect, useRef } from "preact/hooks";
import {
  Shield,
  MapPin,
  Clock,
  Package,
  CheckCircle,
  AlertCircle,
  Navigation,
  RefreshCw,
} from "lucide-preact";
import { dataService } from "../services/data";
import { trackneticsService } from "../services/tracknetics";
import { LoadingSpinner } from "./LoadingSpinner";
import { format } from "date-fns";

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
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh] = useState(true);

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const safeMarkerRef = useRef<google.maps.Marker | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

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

  // Load Google Maps (simplified - no geocoding)
  const loadGoogleMaps = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        setMapsLoaded(true);
        resolve();
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkLoaded = () => {
          if (window.google && window.google.maps) {
            setMapsLoaded(true);
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      const script = document.createElement("script");
      // Removed geocoding library to avoid API issues
      script.src = `https://maps.googleapis.com/maps/api/js?key=${
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      }&libraries=geometry&loading=async&callback=initSimpleCustomerMaps`;
      script.async = true;

      (window as any).initSimpleCustomerMaps = () => {
        setMapsLoaded(true);
        resolve();
      };

      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  };

  // Initialize simplified map (just shows safe location)
  const initializeMap = async () => {
    if (!mapRef.current || !window.google || !mapsLoaded) return;

    console.log("🗺️ Initializing simplified customer map...");

    try {
      const map = new google.maps.Map(mapRef.current, {
        zoom: 13,
        center: { lat: -26.2041, lng: 28.0473 }, // Default to Johannesburg
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      googleMapRef.current = map;
      console.log("✅ Simplified customer map initialized");
    } catch (error) {
      console.error("❌ Error initializing customer map:", error);
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
      console.log(
        `📍 Getting live location for customer tracking (device: ${deviceId})`
      );

      const result = await trackneticsService.getLocationByDeviceId(deviceId);

      if (result.success && result.location) {
        const newLocation: SafeLocationData = {
          location: result.location,
          status: "online",
          lastUpdate: new Date(),
        };
        setSafeLocation(newLocation);
        console.log(`✅ Customer live location updated:`, result.location);
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
    if (!googleMapRef.current || !safeLocation.location) return;

    const position = {
      lat: safeLocation.location.lat,
      lng: safeLocation.location.lng,
    };

    if (!safeMarkerRef.current) {
      // Create safe marker
      safeMarkerRef.current = new google.maps.Marker({
        position,
        map: googleMapRef.current,
        title: `Your Secure Transport`,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          fillColor: "#8B5CF6",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          scale: 12,
        },
      });

      // Safe info window
      const safeInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; color: #8B5CF6;">🚐 Your Secure Transport</h3>
            <div style="font-size: 12px;">
              <p style="margin: 2px 0;"><strong>Status:</strong> ${
                safeLocation.status
              }</p>
              <p style="margin: 2px 0;"><strong>Location:</strong> ${position.lat.toFixed(
                6
              )}, ${position.lng.toFixed(6)}</p>
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
        `,
      });

      safeMarkerRef.current.addListener("click", () => {
        safeInfoWindow.open(googleMapRef.current, safeMarkerRef.current);
      });

      // Center map on safe location
      googleMapRef.current.setCenter(position);
    } else {
      // Update existing marker position
      safeMarkerRef.current.setPosition(position);
      // Re-center map on updated position
      googleMapRef.current.setCenter(position);
    }
  };

  // Initialize everything
  useEffect(() => {
    loadTripData();
    loadGoogleMaps().then(() => {
      initializeMap();
    });
  }, [trackingToken]);

  // Update safe marker when location changes
  useEffect(() => {
    if (mapsLoaded && safeLocation.location) {
      updateSafeMarker();
    }
  }, [safeLocation, mapsLoaded]);

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
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "URGENT";
      case "high":
        return "HIGH PRIORITY";
      default:
        return "STANDARD";
    }
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
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 rounded-lg p-3">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Guardian Safe</h1>
                <p className="text-blue-200">Live Secure Transport Tracking</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-300">
                Updated {format(lastUpdate, "HH:mm:ss")}
              </span>
              {trip.status === "in_transit" && (
                <button
                  onClick={() => {
                    loadTripData(false);
                    updateSafeLocation();
                  }}
                  disabled={locationLoading}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      locationLoading ? "animate-spin" : ""
                    }`}
                  />
                  <span>Refresh</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trip Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-4 mb-4">
                <div
                  className={`p-3 rounded-lg ${statusInfo.color
                    .replace("text-", "text-white bg-")
                    .replace("bg-blue-100", "bg-blue-600")
                    .replace("bg-yellow-100", "bg-yellow-600")
                    .replace("bg-green-100", "bg-green-600")
                    .replace("bg-gray-100", "bg-gray-600")}`}
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
              <div className="text-center">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}
                >
                  {trip.status.replace("_", " ").toUpperCase()}
                </span>
                <p className="text-xs text-gray-400 mt-2">
                  Priority: {getPriorityLabel(trip.priority)}
                </p>
              </div>
            </div>

            {/* Live Location Status */}
            {trip.status === "in_transit" && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <Navigation className="h-5 w-5 mr-2" />
                    Live Location
                  </h3>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      safeLocation.status === "online"
                        ? "bg-green-400 animate-pulse"
                        : "bg-red-400"
                    }`}
                  ></div>
                </div>

                {safeLocation.location ? (
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-green-400">
                        Live Tracking Active
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Coordinates:</span>
                      <span className="font-mono text-xs">
                        {safeLocation.location.lat.toFixed(4)},{" "}
                        {safeLocation.location.lng.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accuracy:</span>
                      <span>±{safeLocation.location.accuracy}m</span>
                    </div>
                    {safeLocation.location.speed && (
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <span>{safeLocation.location.speed} km/h</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Last Update:</span>
                      <span>{format(safeLocation.lastUpdate, "HH:mm:ss")}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    {locationLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <LoadingSpinner size="small" />
                        <span className="text-gray-300">
                          Getting location...
                        </span>
                      </div>
                    ) : (
                      <p className="text-gray-400">
                        {safeLocation.error || "Location not available"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Addresses */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">Locations</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <p className="text-gray-300 font-medium">Pickup</p>
                  </div>
                  <p className="text-white text-sm ml-5">
                    {trip.pickup_address}
                  </p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <p className="text-gray-300 font-medium">Delivery</p>
                  </div>
                  <p className="text-white text-sm ml-5">
                    {trip.delivery_address}
                  </p>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Schedule
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-300 font-medium">Pickup</p>
                  <p className="text-white">
                    {format(
                      new Date(trip.scheduled_pickup),
                      "MMM d, yyyy 'at' HH:mm"
                    )}
                  </p>
                  {trip.actual_pickup_time && (
                    <p className="text-green-400 text-sm">
                      ✓ Completed{" "}
                      {format(
                        new Date(trip.actual_pickup_time),
                        "MMM d 'at' HH:mm"
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-gray-300 font-medium">Delivery</p>
                  <p className="text-white">
                    {format(
                      new Date(trip.scheduled_delivery),
                      "MMM d, yyyy 'at' HH:mm"
                    )}
                  </p>
                  {trip.actual_delivery_time && (
                    <p className="text-green-400 text-sm">
                      ✓ Completed{" "}
                      {format(
                        new Date(trip.actual_delivery_time),
                        "MMM d 'at' HH:mm"
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Transport Details */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">
                Transport Details
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Client:</span>
                  <span className="text-white">{trip.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Transport ID:</span>
                  <span className="text-white font-mono">
                    {trip.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Safe:</span>
                  <span className="text-white">{trip.safes.serial_number}</span>
                </div>
                {trip.requires_signature && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mt-3">
                    <p className="text-yellow-300 text-sm">
                      ⚠️ Signature required upon delivery
                    </p>
                  </div>
                )}
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
          </div>

          {/* Simplified Map */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
              <div className="p-4 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">
                    Live GPS Position
                  </h3>
                  {trip.status === "in_transit" && safeLocation.location && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-sm">Live</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-96 relative">
                {!mapsLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <LoadingSpinner size="large" />
                      <p className="mt-4 text-gray-300">Loading map...</p>
                    </div>
                  </div>
                )}

                <div
                  ref={mapRef}
                  className="w-full h-full"
                  style={{ display: mapsLoaded ? "block" : "none" }}
                />

                {/* No Location Message */}
                {mapsLoaded && !safeLocation.location && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                    <div className="text-center text-white">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium mb-2">
                        Live Tracking Unavailable
                      </p>
                      <p className="text-gray-300 text-sm">
                        {trip.status === "pending"
                          ? "GPS tracking will activate when transport begins"
                          : safeLocation.error || "Location not available"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Simple Legend */}
                {mapsLoaded && safeLocation.location && (
                  <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-purple-400"></div>
                      <span className="text-white">Your Transport</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm mt-8">
          <p className="mb-2">
            Last updated: {format(lastUpdate, "MMM d, yyyy 'at' HH:mm:ss")}
          </p>
          <p>Guardian Safe Security Services - Premium Secure Transport</p>
          {autoRefresh && trip.status === "in_transit" && (
            <p className="text-xs mt-2 text-gray-500">
              🔄 Auto-updating every 30 seconds
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
