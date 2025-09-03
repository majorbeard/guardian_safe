import { useEffect, useState, useRef } from "preact/hooks";
import {
  Map as MapIcon,
  Battery,
  Shield,
  AlertTriangle,
  Navigation,
  Layers,
  Filter,
} from "lucide-preact";
import { safes, criticalAlerts } from "../store/realtime";
import { realtimeActions } from "../store/realtime";
import { apiService } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import AlertBanner from "../components/AlertBanner";
import Button from "../components/Button";
import type { Safe } from "../types";

// Leaflet integration
declare global {
  interface Window {
    L: any;
  }
}

export default function LiveMapPage() {
  const [loading, setLoading] = useState(true);
  const [selectedSafe, setSelectedSafe] = useState<Safe | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: -33.9249, lng: 18.4241 }); // Cape Town default
  const [mapZoom, setMapZoom] = useState(10);
  const [mapView, setMapView] = useState<"normal" | "satellite">("normal");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "error">(
    "all"
  );
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  const safesList = safes.value;
  const alerts = criticalAlerts.value;

  // Initialize Leaflet map
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current || leafletMapRef.current) return;

      // Load Leaflet dynamically
      if (!window.L) {
        const leafletCSS = document.createElement("link");
        leafletCSS.rel = "stylesheet";
        leafletCSS.href =
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
        document.head.appendChild(leafletCSS);

        const leafletScript = document.createElement("script");
        leafletScript.src =
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
        leafletScript.onload = () => createMap();
        document.head.appendChild(leafletScript);
      } else {
        createMap();
      }
    };

    const createMap = () => {
      if (!window.L || !mapRef.current) return;

      // Initialize map
      leafletMapRef.current = window.L.map(mapRef.current).setView(
        [mapCenter.lat, mapCenter.lng],
        mapZoom
      );

      // Add tile layers
      const normalLayer = window.L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "© OpenStreetMap contributors",
        }
      );

      const satelliteLayer = window.L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri",
        }
      );

      // Add default layer
      normalLayer.addTo(leafletMapRef.current);

      // Layer control
      window.L.control
        .layers({
          "Street Map": normalLayer,
          Satellite: satelliteLayer,
        })
        .addTo(leafletMapRef.current);

      // Map event listeners
      leafletMapRef.current.on("click", () => {
        setSelectedSafe(null);
      });

      setLoading(false);
    };

    initializeMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update markers when safes change
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      leafletMapRef.current.removeLayer(marker);
    });
    markersRef.current.clear();

    // Filter safes based on status filter
    const filteredSafes = safesList.filter((safe) => {
      if (filterStatus === "all") return true;
      if (filterStatus === "active") return safe.status === "active";
      if (filterStatus === "error")
        return safe.status === "error" || safe.status === "offline";
      return true;
    });

    // Add new markers
    filteredSafes.forEach((safe) => {
      const markerColor = getMarkerColor(safe);
      const markerIcon = createCustomMarker(markerColor, safe);

      const marker = window.L.marker([safe.location.lat, safe.location.lng], {
        icon: markerIcon,
      }).addTo(leafletMapRef.current);

      // Marker popup
      const popupContent = `
        <div class="p-2">
          <h3 class="font-bold">Safe ${safe.serialNumber}</h3>
          <p class="text-sm">Status: ${safe.status}</p>
          <p class="text-sm">Battery: ${safe.batteryLevel}%</p>
          <p class="text-sm">${safe.isLocked ? "🔒 Locked" : "🔓 Unlocked"}</p>
          ${
            safe.isTampered
              ? '<p class="text-red-600 text-sm">⚠️ Tampered</p>'
              : ""
          }
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("click", () => setSelectedSafe(safe));

      markersRef.current.set(safe.id, marker);
    });
  }, [safesList, filterStatus]);

  const getMarkerColor = (safe: Safe): string => {
    if (safe.status === "error" || safe.status === "offline") return "#ef4444"; // red
    if (safe.isTampered) return "#f97316"; // orange
    if (safe.batteryLevel < 20) return "#eab308"; // yellow
    if (safe.status === "active") return "#22c55e"; // green
    return "#6b7280"; // gray
  };

  const createCustomMarker = (color: string, safe: Safe) => {
    return window.L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
          "></div>
        </div>
        <div style="
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2);
          white-space: nowrap;
        ">${safe.serialNumber}</div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  const centerOnSafe = (safe: Safe) => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([safe.location.lat, safe.location.lng], 15);
      setSelectedSafe(safe);
    }
  };

  const SafeDetailsPanel = ({ safe }: { safe: Safe }) => (
    <div class="bg-white border-l border-gray-200 w-80 p-6 overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900">Safe Details</h3>
        <Button variant="ghost" onClick={() => setSelectedSafe(null)}>
          ×
        </Button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-gray-500">Serial Number</label>
          <p class="text-lg font-mono text-gray-900">{safe.serialNumber}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-500">Status</label>
            <div class="mt-1">
              <StatusBadge status={safe.status} type="safe" />
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Lock Status</label>
            <p class="text-sm text-gray-900 mt-1">
              {safe.isLocked ? "🔒 Locked" : "🔓 Unlocked"}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-500">
              Battery Level
            </label>
            <div class="flex items-center space-x-2 mt-1">
              <Battery
                class={`h-4 w-4 ${
                  safe.batteryLevel > 50
                    ? "text-green-500"
                    : safe.batteryLevel > 20
                    ? "text-yellow-500"
                    : "text-red-500"
                }`}
              />
              <span class="text-sm font-medium">{safe.batteryLevel}%</span>
              <div class="w-16 bg-gray-200 rounded-full h-2">
                <div
                  class={`h-2 rounded-full ${
                    safe.batteryLevel > 50
                      ? "bg-green-500"
                      : safe.batteryLevel > 20
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${safe.batteryLevel}%` }}
                />
              </div>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">
              Tamper Status
            </label>
            <p
              class={`text-sm mt-1 ${
                safe.isTampered ? "text-red-600" : "text-green-600"
              }`}
            >
              {safe.isTampered ? "⚠️ Tampered" : "✅ Secure"}
            </p>
          </div>
        </div>

        <div>
          <label class="text-sm font-medium text-gray-500">Location</label>
          <p class="text-sm text-gray-900 mt-1">
            {safe.location.lat.toFixed(6)}, {safe.location.lng.toFixed(6)}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            Updated: {new Date(safe.location.lastUpdate).toLocaleString()}
          </p>
        </div>

        {safe.assignedTrip && (
          <div>
            <label class="text-sm font-medium text-gray-500">
              Assigned Trip
            </label>
            <p class="text-sm text-gray-900 mt-1">{safe.assignedTrip}</p>
          </div>
        )}

        <div class="pt-4 border-t border-gray-200">
          <label class="text-sm font-medium text-gray-500">Quick Actions</label>
          <div class="mt-2 space-y-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => centerOnSafe(safe)}
            >
              <Navigation class="h-4 w-4 mr-2" />
              Center on Map
            </Button>
            {safe.status === "active" && (
              <>
                {safe.isLocked ? (
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={() => {
                      /* TODO: Emergency unlock */
                    }}
                  >
                    Emergency Unlock
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      /* TODO: Lock safe */
                    }}
                  >
                    Lock Safe
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div class="pt-4 border-t border-gray-200">
          <label class="text-sm font-medium text-gray-500">
            Technical Info
          </label>
          <div class="mt-2 text-xs text-gray-600 space-y-1">
            <p>Firmware: {safe.firmwareVersion}</p>
            <p>Safe ID: {safe.id}</p>
            {safe.lastMaintenance && (
              <p>
                Last Maintenance:{" "}
                {new Date(safe.lastMaintenance).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {(safe.batteryLevel < 20 ||
          safe.isTampered ||
          safe.status === "error") && (
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 class="text-sm font-medium text-red-800 mb-1">
              Attention Required
            </h4>
            <div class="text-xs text-red-700 space-y-1">
              {safe.batteryLevel < 20 && (
                <p>• Battery critically low ({safe.batteryLevel}%)</p>
              )}
              {safe.isTampered && (
                <p>• Tampering detected - inspect immediately</p>
              )}
              {safe.status === "error" && (
                <p>• System error - maintenance required</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p class="text-gray-600">Loading map and safe locations...</p>
        </div>
      </div>
    );
  }

  const activeSafesCount = safesList.filter(
    (s) => s.status === "active"
  ).length;
  const offlineSafesCount = safesList.filter(
    (s) => s.status === "offline" || s.status === "error"
  ).length;
  const lowBatteryCount = safesList.filter((s) => s.batteryLevel < 20).length;

  return (
    <div class="h-full flex flex-col">
      {/* Header */}
      <div class="bg-white border-b border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Live Tracking</h1>
            <p class="text-gray-600">
              Real-time safe locations and status monitoring
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2">
              <Filter class="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus((e.target as HTMLSelectElement).value as any)
                }
                class="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Safes</option>
                <option value="active">Active Only</option>
                <option value="error">Issues Only</option>
              </select>
            </div>
            <div class="text-sm text-gray-600">
              {activeSafesCount} of {safesList.length} safes active
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                // Refresh map and data
                window.location.reload();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div class="bg-yellow-50 border-b border-yellow-200 p-4">
          <div class="space-y-2">
            {alerts.slice(0, 2).map((alert) => (
              <AlertBanner
                key={alert.id}
                alert={alert}
                onDismiss={() => realtimeActions.acknowledgeAlert(alert.id)}
                className="text-sm"
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div class="flex-1 flex">
        {/* Map Area */}
        <div class="flex-1 relative">
          <div ref={mapRef} class="w-full h-full" />

          {/* Map overlay stats */}
          <div class="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-2">
            <div class="text-sm">
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Active:</span>
                <span class="font-medium text-green-600">
                  {activeSafesCount}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Offline:</span>
                <span class="font-medium text-red-600">
                  {offlineSafesCount}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600">Low Battery:</span>
                <span class="font-medium text-yellow-600">
                  {lowBatteryCount}
                </span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div class="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
            <div class="text-xs font-medium text-gray-700 mb-2">
              Safe Status
            </div>
            <div class="space-y-1">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-green-500 rounded-full" />
                <span class="text-xs text-gray-600">Active & Healthy</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-yellow-500 rounded-full" />
                <span class="text-xs text-gray-600">Low Battery</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-orange-500 rounded-full" />
                <span class="text-xs text-gray-600">Tampered</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-red-500 rounded-full" />
                <span class="text-xs text-gray-600">Error/Offline</span>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-gray-500 rounded-full" />
                <span class="text-xs text-gray-600">Inactive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safe Details Panel */}
        {selectedSafe && <SafeDetailsPanel safe={selectedSafe} />}
      </div>

      {/* Bottom Status Bar */}
      <div class="bg-white border-t border-gray-200 p-3">
        <div class="flex items-center justify-between text-sm text-gray-600">
          <div class="flex items-center space-x-6">
            <div class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-green-500 rounded-full" />
              <span>Active: {activeSafesCount}</span>
            </div>
            <div class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-red-500 rounded-full" />
              <span>Issues: {offlineSafesCount}</span>
            </div>
            <div class="flex items-center space-x-1">
              <div class="w-2 h-2 bg-yellow-500 rounded-full" />
              <span>Low Battery: {lowBatteryCount}</span>
            </div>
            {alerts.length > 0 && (
              <div class="flex items-center space-x-1">
                <AlertTriangle class="w-3 h-3 text-red-500" />
                <span class="text-red-600">
                  Critical Alerts: {alerts.length}
                </span>
              </div>
            )}
          </div>
          <div class="flex items-center space-x-4">
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
            <span>Showing: {safesList.length} safes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
