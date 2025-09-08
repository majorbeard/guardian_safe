import { useState, useEffect } from "preact/hooks";
import { MapPin, Navigation, RefreshCw, Satellite } from "lucide-preact";
import { LoadingSpinner } from "./LoadingSpinner";
import type { Safe } from "../types";

interface LiveTrackingProps {
  safes: Safe[];
}

interface LocationData {
  lat: number;
  lng: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
}

export function LiveTracking({ safes }: LiveTrackingProps) {
  const [locations, setLocations] = useState<Record<string, LocationData>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mapView, setMapView] = useState<"roadmap" | "satellite">("roadmap");

  // Mock tracking API - replace with real implementation
  const fetchLocation = async (
    _trackingId: string
  ): Promise<LocationData | null> => {
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock data - replace with real tracking API
    return {
      lat: -33.9249 + (Math.random() - 0.5) * 0.01,
      lng: 18.4241 + (Math.random() - 0.5) * 0.01,
      timestamp: new Date().toISOString(),
      accuracy: Math.round(5 + Math.random() * 10),
      speed: Math.round(Math.random() * 60),
    };
  };

  const updateLocations = async () => {
    setLoading(true);
    const newLocations: Record<string, LocationData> = {};

    for (const safe of safes) {
      if (safe.tracking_device_id && safe.status === "active") {
        try {
          const location = await fetchLocation(safe.tracking_device_id);
          if (location) {
            newLocations[safe.id] = location;
          }
        } catch (error) {
          console.error(`Failed to fetch location for safe ${safe.id}:`, error);
        }
      }
    }

    setLocations(newLocations);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    updateLocations();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(updateLocations, 30000);

    return () => clearInterval(interval);
  }, [safes]);

  const trackingSafes = safes.filter(
    (safe) => safe.tracking_device_id && safe.status === "active"
  );

  if (trackingSafes.length === 0) {
    return (
      <div className="card text-center py-12">
        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Tracking Available
        </h3>
        <p className="text-gray-500">
          No active safes with tracking devices found.
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
            <h3 className="text-lg font-medium text-gray-900">Live Tracking</h3>
            <p className="text-sm text-gray-500">
              {lastUpdate && `Last updated: ${lastUpdate.toLocaleTimeString()}`}
            </p>
          </div>

          <div className="flex items-center space-x-3">
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

      {/* Map Placeholder */}
      <div className="card">
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Map integration placeholder</p>
            <p className="text-sm text-gray-400 mt-2">
              Integrate with Google Maps, Mapbox, or similar service
            </p>
          </div>
        </div>
      </div>

      {/* Location Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {trackingSafes.map((safe) => {
          const location = locations[safe.id];

          return (
            <div key={safe.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      location ? "bg-green-100" : "bg-gray-100"
                    }`}
                  >
                    <MapPin
                      className={`h-5 w-5 ${
                        location ? "text-green-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Safe {safe.serial_number}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Tracking ID: {safe.tracking_device_id}
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    location
                      ? "text-green-800 bg-green-100"
                      : "text-gray-800 bg-gray-100"
                  }`}
                >
                  {location ? "Online" : "No Signal"}
                </span>
              </div>

              {location ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Latitude</p>
                      <p className="font-mono text-gray-900">
                        {location.lat.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Longitude</p>
                      <p className="font-mono text-gray-900">
                        {location.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Accuracy</p>
                      <p className="text-gray-900">±{location.accuracy}m</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Speed</p>
                      <p className="text-gray-900">{location.speed} km/h</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Last update:{" "}
                      {new Date(location.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No location data available</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Check device connection and GPS signal
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Integration Notes</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            • Replace mock tracking API with your actual tracking provider
          </li>
          <li>• Integrate with Google Maps or Mapbox for real map display</li>
          <li>• Consider WebSocket updates for real-time location streaming</li>
          <li>• Add geofencing alerts for pickup/delivery locations</li>
        </ul>
      </div>
    </div>
  );
}
