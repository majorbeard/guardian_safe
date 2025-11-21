import { useState, useEffect, useRef } from "preact/hooks";
import {
  MapPin,
  Navigation,
  RefreshCw,
  Satellite,
  AlertTriangle,
  Battery,
} from "lucide-preact";
import { LoadingSpinner } from "./LoadingSpinner";
import { trackneticsService } from "../services/tracknetics";
import type { Safe } from "../types";
import { formatDistanceToNow } from "date-fns";
import L from "leaflet";
import {
  fixLeafletIcons,
  createArrowIcon,
  getOpenStreetMapLayer,
  getSatelliteLayer,
} from "../utils/leafletHelpers";

interface LiveTrackingProps {
  safes: Safe[];
}

interface SafeLocationData {
  safeId: string;
  serialNumber: string;
  deviceId: string | null;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    speed?: number;
    course?: number;
    isGPS?: boolean;
    positionTime?: string;
  };
  status: "online" | "offline" | "no_tracker" | "error";
  error?: string;
  lastUpdate: Date;
}

export function LiveTracking({ safes }: LiveTrackingProps) {
  const [locations, setLocations] = useState<SafeLocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mapView, setMapView] = useState<"roadmap" | "satellite">("roadmap");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Initialize Leaflet map
  const initializeMap = () => {
    if (!mapRef.current || leafletMapRef.current) return;

    console.log("Initializing Leaflet Map...");

    try {
      // Fix Leaflet icons
      fixLeafletIcons();

      // Create map centered on Johannesburg
      const map = L.map(mapRef.current, {
        center: [-26.2041, 28.0473],
        zoom: 8,
        zoomControl: true,
      });

      // Add tile layer based on view type
      if (mapView === "satellite") {
        getSatelliteLayer().addTo(map);
      } else {
        getOpenStreetMapLayer().addTo(map);
      }

      leafletMapRef.current = map;
      setMapsLoaded(true);

      console.log("Leaflet Map initialized successfully");
    } catch (error) {
      console.error("Error initializing Leaflet Map:", error);
    }
  };

  // Update map markers
  // Update map markers
  const updateMapMarkers = () => {
    if (!leafletMapRef.current || !mapsLoaded) {
      console.log("⏳ Map not ready for marker updates");
      return;
    }

    console.log("Updating map markers...");

    try {
      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const bounds: L.LatLngBoundsExpression = [];
      let hasValidLocations = false;

      // Create new markers
      for (const safeLocation of locations) {
        if (!safeLocation.location) continue;

        const position: L.LatLngExpression = [
          safeLocation.location.lat,
          safeLocation.location.lng,
        ];

        // Choose icon based on status and movement
        const color = safeLocation.status === "online" ? "#10B981" : "#EF4444";
        const icon =
          safeLocation.location.speed && safeLocation.location.speed > 5
            ? createArrowIcon(color, safeLocation.location.course || 0)
            : L.divIcon({
                className: "custom-marker",
                html: `<div style="
                background-color: ${color};
                width: 20px;
                height: 20px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              "></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });

        const marker = L.marker(position, { icon }).addTo(
          leafletMapRef.current!
        );

        // Create popup
        const popupContent = `
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
            Safe ${safeLocation.serialNumber}
          </h3>
          <div style="font-size: 14px; line-height: 1.4;">
            <p style="margin: 4px 0;"><strong>Status:</strong> ${getStatusLabel(
              safeLocation.status
            )}</p>
            <p style="margin: 4px 0;"><strong>Location:</strong> ${position[0].toFixed(
              6
            )}, ${position[1].toFixed(6)}</p>
            <p style="margin: 4px 0;"><strong>Accuracy:</strong> ±${
              safeLocation.location.accuracy
            }m</p>
            <p style="margin: 4px 0;"><strong>Updated:</strong> ${formatDistanceToNow(
              safeLocation.lastUpdate
            )} ago</p>
            ${
              safeLocation.location.speed
                ? `<p style="margin: 4px 0;"><strong>Speed:</strong> ${safeLocation.location.speed} km/h</p>`
                : ""
            }
          </div>
        </div>
      `;

        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
        bounds.push(position);
        hasValidLocations = true;
      }

      // Fit bounds to show all markers
      if (hasValidLocations && bounds.length > 0) {
        leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }

      // ADD THIS - Force map redraw
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }

      console.log(`Updated ${markersRef.current.length} markers on map`);
    } catch (error) {
      console.error("Error updating markers:", error);
    }
  };

  // Switch map layer when view changes
  useEffect(() => {
    if (leafletMapRef.current) {
      // Remove all tile layers
      leafletMapRef.current.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          leafletMapRef.current!.removeLayer(layer);
        }
      });

      // Add new tile layer
      if (mapView === "satellite") {
        getSatelliteLayer().addTo(leafletMapRef.current);
      } else {
        getOpenStreetMapLayer().addTo(leafletMapRef.current);
      }
    }
  }, [mapView]);

  // Initialize map on mount
  useEffect(() => {
    initializeMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (mapsLoaded) {
      console.log("Locations changed, updating markers");
      updateMapMarkers();
    }
  }, [locations, mapsLoaded]);

  // Get trackable safes
  const trackableSafes = safes.filter(
    (safe) => safe.tracknetics_device_id || safe.tracking_device_id
  );

  const updateLocations = async () => {
    if (trackableSafes.length === 0) return;

    setLoading(true);
    const newLocations: SafeLocationData[] = [];

    console.log(
      "Updating locations for",
      trackableSafes.length,
      "trackable safes"
    );

    for (const safe of trackableSafes) {
      const deviceId = safe.tracknetics_device_id || safe.tracking_device_id;

      const safeLocation: SafeLocationData = {
        safeId: safe.id,
        serialNumber: safe.serial_number,
        deviceId: deviceId || null,
        status: "offline",
        lastUpdate: new Date(),
      };

      if (deviceId) {
        try {
          console.log(
            `Getting location for safe ${safe.serial_number} (device: ${deviceId})`
          );

          const result = await trackneticsService.getLocationByDeviceId(
            deviceId
          );

          if (result.success && result.location) {
            safeLocation.location = {
              lat: result.location.lat,
              lng: result.location.lng,
              accuracy: result.location.accuracy,
              timestamp: result.location.timestamp,
            };
            safeLocation.status = "online";
            console.log(
              `Location found for ${safe.serial_number}:`,
              result.location
            );
          } else {
            safeLocation.status = "offline";
            safeLocation.error = result.error || "No location data";
            console.log(`No location for ${safe.serial_number}:`, result.error);
          }
        } catch (error: any) {
          safeLocation.status = "error";
          safeLocation.error = error.message || "Failed to get location";
          console.error(
            `Error getting location for ${safe.serial_number}:`,
            error
          );
        }
      } else {
        safeLocation.status = "no_tracker";
        safeLocation.error = "No tracking device assigned";
      }

      newLocations.push(safeLocation);
    }

    setLocations([...newLocations]);
    setLastUpdate(new Date());
    setLoading(false);

    console.log("Location update complete:", newLocations);
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    updateLocations();

    if (autoRefresh) {
      const interval = setInterval(updateLocations, 30000);
      return () => clearInterval(interval);
    }
  }, [safes, autoRefresh]);

  const getStatusColor = (status: SafeLocationData["status"]) => {
    switch (status) {
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

  const getStatusLabel = (status: SafeLocationData["status"]) => {
    switch (status) {
      case "online":
        return "Online";
      case "offline":
        return "Offline";
      case "no_tracker":
        return "No Tracker";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  if (trackableSafes.length === 0) {
    return (
      <div className="card text-center py-12">
        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Trackable Safes
        </h3>
        <p className="text-gray-500 mb-4">
          No safes have tracking devices assigned.
        </p>
        <p className="text-sm text-gray-400">
          Add a tracking device ID to safes in the database to enable live
          tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Live GPS Tracking
            </h3>
            <p className="text-sm text-gray-500">
              {lastUpdate && `Last updated: ${lastUpdate.toLocaleTimeString()}`}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Auto-refresh toggle */}
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) =>
                  setAutoRefresh((e.target as HTMLInputElement).checked)
                }
                className="rounded"
              />
              <span>Auto-refresh</span>
            </label>

            {/* Map view toggle */}
            <div className="flex rounded-lg border border-gray-300">
              <button
                onClick={() => setMapView("roadmap")}
                className={`px-3 py-1 text-sm rounded-l-lg ${
                  mapView === "roadmap"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Navigation className="h-4 w-4" />
              </button>
              <button
                onClick={() => setMapView("satellite")}
                className={`px-3 py-1 text-sm rounded-r-lg ${
                  mapView === "satellite"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Satellite className="h-4 w-4" />
              </button>
            </div>

            {/* Manual refresh */}
            <button
              onClick={updateLocations}
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
          </div>
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="card">
        <div className="h-96 rounded-lg overflow-hidden bg-gray-200">
          {!mapsLoaded && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <LoadingSpinner size="large" />
                <p className="mt-4 text-gray-600">Loading map...</p>
              </div>
            </div>
          )}
          <div
            ref={mapRef}
            className="w-full h-full"
            style={{ minHeight: "384px" }}
          />
        </div>

        {/* Map Legend */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Offline</span>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Click markers for details •{" "}
            {locations.filter((l) => l.location).length} of {locations.length}{" "}
            safes located
          </div>
        </div>
      </div>

      {/* Location Status Cards - keeping your existing cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations.map((safeLocation) => {
          const safe = safes.find((s) => s.id === safeLocation.safeId);

          return (
            <div key={safeLocation.safeId} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      safeLocation.status === "online"
                        ? "bg-green-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <MapPin
                      className={`h-5 w-5 ${
                        safeLocation.status === "online"
                          ? "text-green-600"
                          : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Safe {safeLocation.serialNumber}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Device: {safeLocation.deviceId || "None"}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    safeLocation.status
                  )}`}
                >
                  {getStatusLabel(safeLocation.status)}
                </span>
              </div>

              {safeLocation.location ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Latitude</p>
                      <p className="font-mono text-gray-900">
                        {safeLocation.location.lat.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Longitude</p>
                      <p className="font-mono text-gray-900">
                        {safeLocation.location.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Accuracy</p>
                      <p className="text-gray-900">
                        ±{safeLocation.location.accuracy}m
                        {safeLocation.location.isGPS && (
                          <span className="ml-1 text-green-600 text-xs">
                            GPS
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Updated</p>
                      <p className="text-gray-900 text-xs">
                        {formatDistanceToNow(safeLocation.lastUpdate)} ago
                      </p>
                    </div>
                  </div>

                  {/* Safe Status Integration */}
                  {safe && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Battery className="h-3 w-3 text-gray-400" />
                            <span
                              className={`text-xs ${
                                safe.battery_level > 50
                                  ? "text-green-600"
                                  : safe.battery_level > 20
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            >
                              {safe.battery_level}%
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                safe.status === "active"
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            <span className="text-xs text-gray-600 capitalize">
                              {safe.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {safeLocation.error || "No location data available"}
                  </p>
                  {safeLocation.status === "no_tracker" && (
                    <p className="text-xs text-gray-400 mt-1">
                      Add tracking device ID to database
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* System Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">System Status:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            Real-time tracking:{" "}
            {autoRefresh ? "Active (30s intervals)" : "Manual only"}
          </li>
          <li>Open source mapping with Leaflet</li>
        </ul>
      </div>
    </div>
  );
}
