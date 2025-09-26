import { useState, useEffect, useRef } from "preact/hooks";
import {
  X,
  Navigation,
  RefreshCw,
  Clock,
  User,
  Package,
  AlertTriangle,
  Smartphone,
  Route,
} from "lucide-preact";
import { LoadingSpinner } from "./LoadingSpinner";
import { trackneticsService } from "../services/tracknetics";
import { safes } from "../store/data";
import { formatDistanceToNow, format } from "date-fns";

interface TripTrackingModalProps {
  trip: {
    id: string;
    safe_id: string;
    client_name: string;
    pickup_address: string;
    delivery_address: string;
    status: string;
    scheduled_pickup: string;
    scheduled_delivery: string;
    special_instructions?: string;
    priority?: string;
  };
  onClose: () => void;
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

export function TripTrackingModal({ trip, onClose }: TripTrackingModalProps) {
  const [location, setLocation] = useState<SafeLocationData>({
    status: "offline",
    lastUpdate: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const safeMarkerRef = useRef<google.maps.Marker | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapsError, setMapsError] = useState<string>("");

  // Get safe info
  const safe = safes.value.find((s) => s.id === trip.safe_id);
  const deviceId = safe?.tracknetics_device_id || safe?.tracking_device_id;

  // Get mobile app username (assuming it's tied to safe)
  const mobileUsername =
    safe?.mobile_users?.[0]?.username ||
    (safe?.serial_number
      ? safe.serial_number.toLowerCase().replace(/[^a-z0-9]/g, "") + "_driver"
      : "Unknown");

  // Load Google Maps with proper error handling
  const loadGoogleMaps = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log("✅ Google Maps already loaded (Trip Modal)");
        setMapsLoaded(true);
        resolve();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector(
        'script[src*="maps.googleapis.com"]'
      );
      if (existingScript) {
        console.log(
          "🔄 Google Maps script already exists, waiting for load... (Trip Modal)"
        );
        const checkLoaded = () => {
          if (window.google && window.google.maps) {
            console.log(
              "✅ Google Maps loaded via existing script (Trip Modal)"
            );
            setMapsLoaded(true);
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      // Check if API key is available
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        const error = "Google Maps API key not configured";
        console.error("❌ Trip Modal:", error);
        setMapsError(error);
        reject(new Error(error));
        return;
      }

      console.log("📦 Loading Google Maps API... (Trip Modal)");

      // Create unique callback name to avoid conflicts
      const callbackName = `initTripMaps_${Date.now()}`;

      // Set up global callback
      (window as any)[callbackName] = () => {
        console.log("✅ Google Maps API loaded successfully (Trip Modal)");
        setMapsLoaded(true);
        setMapsError("");
        // Clean up callback
        delete (window as any)[callbackName];
        resolve();
      };

      // Create and load script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=${callbackName}`;
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        const error = "Failed to load Google Maps API";
        console.error("❌ Trip Modal:", error);
        setMapsError(error);
        delete (window as any)[callbackName];
        reject(new Error(error));
      };

      document.head.appendChild(script);
    });
  };

  // Initialize Google Map (simplified - no route planning)
  const initializeMap = async () => {
    if (!mapRef.current) {
      console.log(
        "⏳ Trip Modal: Map initialization skipped - mapRef not available"
      );
      return;
    }

    if (!window.google || !window.google.maps) {
      console.log(
        "⏳ Trip Modal: Map initialization skipped - Google Maps not loaded"
      );
      return;
    }

    if (!mapsLoaded) {
      console.log(
        "⏳ Trip Modal: Map initialization skipped - mapsLoaded is false"
      );
      return;
    }

    if (googleMapRef.current) {
      console.log("⏳ Trip Modal: Map already initialized");
      return;
    }

    console.log("🗺️ Initializing simplified trip tracking map...");

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
        // Ensure map controls are visible
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
      });

      googleMapRef.current = map;

      // Wait for map to be idle before proceeding
      google.maps.event.addListenerOnce(map, "idle", () => {
        console.log("✅ Simplified trip tracking map initialized and ready");

        // If we already have location data, update marker immediately
        if (location.location) {
          console.log(
            "🔄 Trip Modal: Map ready, updating marker with existing location"
          );
          updateSafeMarker();
        }
      });
    } catch (error) {
      console.error("❌ Error initializing trip map:", error);
      setMapsError("Failed to initialize map");
    }
  };

  // Update safe marker position
  const updateSafeMarker = () => {
    if (!googleMapRef.current) {
      console.log(
        "⏳ Trip Modal: Skipping marker update - googleMapRef not available"
      );
      return;
    }

    if (!location.location) {
      console.log("⏳ Trip Modal: Skipping marker update - no location data");
      return;
    }

    const position = {
      lat: location.location.lat,
      lng: location.location.lng,
    };

    console.log("📍 Trip Modal: Updating safe marker at:", position);

    try {
      if (!safeMarkerRef.current) {
        // Create safe marker
        safeMarkerRef.current = new google.maps.Marker({
          position,
          map: googleMapRef.current,
          title: `Safe ${safe?.serial_number}`,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            fillColor: "#8B5CF6",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
            scale: 12,
          },
        });

        // Safe marker info window
        const safeInfoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: #8B5CF6;">🚐 Safe ${
                safe?.serial_number
              }</h3>
              <div style="font-size: 12px; line-height: 1.4;">
                <p style="margin: 2px 0;"><strong>Driver:</strong> ${mobileUsername}</p>
                <p style="margin: 2px 0;"><strong>Client:</strong> ${
                  trip.client_name
                }</p>
                <p style="margin: 2px 0;"><strong>Status:</strong> ${
                  location.status
                }</p>
                <p style="margin: 2px 0;"><strong>Location:</strong> ${position.lat.toFixed(
                  6
                )}, ${position.lng.toFixed(6)}</p>
                <p style="margin: 2px 0;"><strong>Accuracy:</strong> ±${
                  location.location.accuracy
                }m</p>
                ${
                  location.location.speed
                    ? `<p style="margin: 2px 0;"><strong>Speed:</strong> ${location.location.speed} km/h</p>`
                    : ""
                }
                <p style="margin: 2px 0;"><strong>Updated:</strong> ${formatDistanceToNow(
                  location.lastUpdate
                )} ago</p>
              </div>
            </div>
          `,
        });

        safeMarkerRef.current.addListener("click", () => {
          safeInfoWindow.open(googleMapRef.current, safeMarkerRef.current);
        });

        // Center map on safe location
        googleMapRef.current.setCenter(position);
        // Adjust zoom to show marker clearly
        googleMapRef.current.setZoom(15);
        console.log("✅ Trip Modal: Safe marker created and map centered");
      } else {
        // Update existing marker position
        safeMarkerRef.current.setPosition(position);
        // Re-center map on updated position
        googleMapRef.current.setCenter(position);
        console.log("✅ Trip Modal: Safe marker position updated");
      }
    } catch (error) {
      console.error("❌ Trip Modal: Error updating safe marker:", error);
    }
  };

  // Get current safe location
  const updateLocation = async () => {
    if (!deviceId) {
      setLocation({
        status: "no_tracker",
        error: "No tracking device assigned",
        lastUpdate: new Date(),
      });
      return;
    }

    setLoading(true);

    try {
      console.log(
        `📍 Getting location for safe ${safe?.serial_number} (device: ${deviceId})`
      );

      const result = await trackneticsService.getLocationByDeviceId(deviceId);

      if (result.success && result.location) {
        const newLocation: SafeLocationData = {
          location: result.location,
          status: "online",
          lastUpdate: new Date(),
        };
        setLocation(newLocation);
        setLastUpdate(new Date());

        console.log(
          `✅ Location updated for ${safe?.serial_number}:`,
          result.location
        );
      } else {
        setLocation({
          status: "offline",
          error: result.error || "No location data",
          lastUpdate: new Date(),
        });
        console.log(`❌ No location for ${safe?.serial_number}:`, result.error);
      }
    } catch (error: any) {
      setLocation({
        status: "error",
        error: error.message || "Failed to get location",
        lastUpdate: new Date(),
      });
      console.error(
        `💥 Error getting location for ${safe?.serial_number}:`,
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // Initialize
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          initializeMap();
        }, 100);
      })
      .catch((error) => {
        console.error("Failed to load Google Maps:", error);
        setMapsError(error.message);
      });
  }, []);

  // Initialize map when mapsLoaded changes
  useEffect(() => {
    if (mapsLoaded && !mapsError && mapRef.current && !googleMapRef.current) {
      console.log(
        "🔄 Trip Modal: Initializing map after mapsLoaded state change"
      );
      setTimeout(() => {
        initializeMap();
      }, 100);
    }
  }, [mapsLoaded, mapsError]);

  // Update safe marker when location changes
  useEffect(() => {
    if (mapsLoaded && location.location && !mapsError && googleMapRef.current) {
      updateSafeMarker();
    }
  }, [location, mapsLoaded, mapsError]);

  // Auto-refresh location
  useEffect(() => {
    updateLocation();

    if (autoRefresh) {
      const interval = setInterval(updateLocation, 30000);
      return () => clearInterval(interval);
    }
  }, [deviceId, autoRefresh]);

  const getStatusColor = () => {
    switch (location.status) {
      case "online":
        return "text-green-600 bg-green-100";
      case "offline":
        return "text-red-600 bg-red-100";
      case "no_tracker":
        return "text-gray-600 bg-gray-100";
      case "error":
        return "text-orange-600 bg-orange-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityColor = () => {
    switch (trip.priority) {
      case "urgent":
        return "text-red-600 bg-red-100";
      case "high":
        return "text-orange-600 bg-orange-100";
      case "normal":
        return "text-blue-600 bg-blue-100";
      case "low":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-blue-600 bg-blue-100";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 rounded-lg p-3">
              <Route className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Live Tracking
              </h2>
              <p className="text-gray-500">
                Trip {trip.id.slice(-8).toUpperCase()} • Safe{" "}
                {safe?.serial_number}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor()}`}
            >
              {trip.priority?.toUpperCase() || "NORMAL"} PRIORITY
            </span>

            <button
              onClick={updateLocation}
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Trip Info Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Client Info */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Client</h3>
                </div>
                <p className="text-gray-900 font-medium">{trip.client_name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Priority: {trip.priority?.toUpperCase() || "NORMAL"}
                </p>
              </div>

              {/* Safe Status */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Safe Status</h3>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
                  >
                    {location.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Serial:</span>
                    <span className="font-mono">{safe?.serial_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Battery:</span>
                    <span
                      className={`font-medium ${
                        (safe?.battery_level || 0) > 50
                          ? "text-green-600"
                          : (safe?.battery_level || 0) > 20
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {safe?.battery_level}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lock Status:</span>
                    <span
                      className={
                        safe?.is_locked ? "text-green-600" : "text-red-600"
                      }
                    >
                      {safe?.is_locked ? "SECURED" : "OPEN"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Driver Info */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Smartphone className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Driver</h3>
                </div>
                <p className="text-gray-900 font-medium">{mobileUsername}</p>
                <p className="text-sm text-gray-500">Mobile App User</p>
              </div>

              {/* Location Info */}
              {location.location && (
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Navigation className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">
                      Current Location
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Coordinates:</span>
                      <p className="font-mono text-xs">
                        {location.location.lat.toFixed(6)},{" "}
                        {location.location.lng.toFixed(6)}
                      </p>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Accuracy:</span>
                      <span>±{location.location.accuracy}m</span>
                    </div>
                    {location.location.speed && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Speed:</span>
                        <span>{location.location.speed} km/h</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Updated:</span>
                      <span>
                        {formatDistanceToNow(location.lastUpdate)} ago
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Schedule</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Pickup:</p>
                    <p className="font-medium">
                      {format(
                        new Date(trip.scheduled_pickup),
                        "MMM d, yyyy 'at' HH:mm"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Delivery:</p>
                    <p className="font-medium">
                      {format(
                        new Date(trip.scheduled_delivery),
                        "MMM d, yyyy 'at' HH:mm"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Special Instructions */}
              {trip.special_instructions && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-yellow-800">
                      Special Instructions
                    </h3>
                  </div>
                  <p className="text-yellow-700 text-sm">
                    {trip.special_instructions}
                  </p>
                </div>
              )}

              {/* Auto-refresh Toggle */}
              <div className="bg-white rounded-lg p-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) =>
                      setAutoRefresh((e.target as HTMLInputElement).checked)
                    }
                    className="rounded"
                  />
                  <div>
                    <span className="font-medium text-gray-900">
                      Auto-refresh
                    </span>
                    <p className="text-xs text-gray-500">
                      Updates every 30 seconds
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            {/* Loading State */}
            {!mapsLoaded && !mapsError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <LoadingSpinner size="large" />
                  <p className="mt-4 text-gray-600">Loading route map...</p>
                </div>
              </div>
            )}

            {/* Maps Error State */}
            {mapsError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                  <p className="text-lg font-medium mb-2">Map Error</p>
                  <p className="text-gray-600 text-sm max-w-xs mb-4">
                    {mapsError}
                  </p>
                  <button
                    onClick={() => {
                      setMapsError("");
                      setMapsLoaded(false);
                      loadGoogleMaps().then(initializeMap).catch(console.error);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Map Container */}
            <div
              ref={mapRef}
              className="w-full h-full"
              style={{
                display: mapsLoaded && !mapsError ? "block" : "none",
                minHeight: "400px",
              }}
            />

            {/* Map Legend */}
            {mapsLoaded && !mapsError && location.location && (
              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-purple-500"></div>
                  <span>Safe Position</span>
                </div>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    location.status === "online"
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                ></div>
                <span className="text-sm font-medium">
                  {lastUpdate
                    ? `Updated ${formatDistanceToNow(lastUpdate)} ago`
                    : "No updates yet"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
