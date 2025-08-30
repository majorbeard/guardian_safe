import { useEffect, useState, useRef } from 'preact/hooks';
import { Map as MapIcon, Battery, Shield, AlertTriangle, Navigation } from 'lucide-preact';
import { safes, criticalAlerts } from '../store/realtime';
import { realtimeActions } from '../store/realtime';
import { apiService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import AlertBanner from '../components/AlertBanner';
import Button from '../components/Button';
import type { Safe } from '../types';

export default function LiveMapPage() {
  const [loading, setLoading] = useState(true);
  const [selectedSafe, setSelectedSafe] = useState<Safe | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: -33.9249, lng: 18.4241 }); // Cape Town default
  const mapRef = useRef<HTMLDivElement>(null);
  const safesList = safes.value;
  const alerts = criticalAlerts.value;

  useEffect(() => {
    const loadSafes = async () => {
      setLoading(true);
      const response = await apiService.getSafes();
      
      if (response.success && response.data) {
        realtimeActions.setSafes(response.data);
      }
      
      setLoading(false);
    };

    loadSafes();
  }, []);

  // Simple map placeholder - in production, you'd integrate with Leaflet here
  const MapPlaceholder = () => (
    <div class="w-full h-full bg-gray-100 flex items-center justify-center relative overflow-hidden">
      {/* Map Background Pattern */}
      <div class="absolute inset-0 opacity-10">
        <div class="grid grid-cols-8 h-full">
          {Array.from({ length: 64 }).map((_, i) => (
            <div key={i} class="border border-gray-300" />
          ))}
        </div>
      </div>

      {/* Safe Markers */}
      <div class="absolute inset-0">
        {safesList.map((safe, index) => {
          const x = 20 + (index * 120) % 400; // Simulate positions
          const y = 50 + ((index * 80) % 300);
          
          return (
            <div
              key={safe.id}
              class="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}px`, top: `${y}px` }}
              onClick={() => setSelectedSafe(safe)}
            >
              <div class={`p-2 rounded-full shadow-lg ${
                safe.status === 'active' ? 'bg-green-500' :
                safe.status === 'error' ? 'bg-red-500' :
                'bg-gray-500'
              }`}>
                <Shield class="h-4 w-4 text-white" />
              </div>
              <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs bg-white px-1 py-0.5 rounded border shadow">
                {safe.serialNumber}
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Controls */}
      <div class="absolute top-4 left-4 text-gray-600 text-sm bg-white px-3 py-2 rounded-lg shadow">
        <div class="flex items-center space-x-2">
          <MapIcon class="h-4 w-4" />
          <span>Live Safe Tracking</span>
        </div>
      </div>

      {/* Legend */}
      <div class="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow">
        <div class="text-xs font-medium text-gray-700 mb-2">Safe Status</div>
        <div class="space-y-1">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-green-500 rounded-full" />
            <span class="text-xs text-gray-600">Active</span>
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
  );

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
              {safe.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-500">Battery Level</label>
            <div class="flex items-center space-x-2 mt-1">
              <Battery class={`h-4 w-4 ${
                safe.batteryLevel > 50 ? 'text-green-500' :
                safe.batteryLevel > 20 ? 'text-yellow-500' :
                'text-red-500'
              }`} />
              <span class="text-sm font-medium">{safe.batteryLevel}%</span>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500">Tamper Status</label>
            <p class={`text-sm mt-1 ${safe.isTampered ? 'text-red-600' : 'text-green-600'}`}>
              {safe.isTampered ? '⚠️ Tampered' : '✅ Secure'}
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
            <label class="text-sm font-medium text-gray-500">Assigned Trip</label>
            <p class="text-sm text-gray-900 mt-1">{safe.assignedTrip}</p>
          </div>
        )}

        <div class="pt-4 border-t border-gray-200">
          <label class="text-sm font-medium text-gray-500">Actions</label>
          <div class="mt-2 space-y-2">
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={() => {/* TODO: Center map on safe */}}
            >
              <Navigation class="h-4 w-4 mr-2" />
              Center on Map
            </Button>
            {safe.isLocked ? (
              <Button 
                variant="danger" 
                className="w-full"
                onClick={() => {/* TODO: Unlock safe */}}
              >
                Unlock Safe
              </Button>
            ) : (
              <Button 
                variant="primary" 
                className="w-full"
                onClick={() => {/* TODO: Lock safe */}}
              >
                Lock Safe
              </Button>
            )}
          </div>
        </div>

        <div class="pt-4 border-t border-gray-200">
          <label class="text-sm font-medium text-gray-500">Technical Info</label>
          <div class="mt-2 text-xs text-gray-600 space-y-1">
            <p>Firmware: {safe.firmwareVersion}</p>
            {safe.lastMaintenance && (
              <p>Last Maintenance: {new Date(safe.lastMaintenance).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p class="text-gray-600">Loading safe locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div class="h-full flex flex-col">
      {/* Header */}
      <div class="bg-white border-b border-gray-200 p-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Live Tracking</h1>
            <p class="text-gray-600">Real-time safe locations and status</p>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-600">
              {safesList.filter(s => s.status === 'active').length} of {safesList.length} safes active
            </div>
            <Button variant="secondary" onClick={() => {/* TODO: Refresh locations */}}>
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
          <div ref={mapRef} class="w-full h-full">
            <MapPlaceholder />
          </div>
        </div>

        {/* Safe Details Panel */}
        {selectedSafe && <SafeDetailsPanel safe={selectedSafe} />}
      </div>

      {/* Bottom Status Bar */}
      <div class="bg-white border-t border-gray-200 p-3">
        <div class="flex items-center justify-between text-sm text-gray-600">
          <div class="flex items-center space-x-4">
            <span>Active: {safesList.filter(s => s.status === 'active').length}</span>
            <span>Offline: {safesList.filter(s => s.status === 'offline').length}</span>
            <span>Low Battery: {safesList.filter(s => s.batteryLevel < 20).length}</span>
          </div>
          <div>
            Last Updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}