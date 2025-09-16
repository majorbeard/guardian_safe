import { Geolocation } from "@capacitor/geolocation";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

class GeolocationService {
  // Get current position with high accuracy
  async getCurrentPosition(): Promise<{
    success: boolean;
    location?: LocationData;
    error?: string;
  }> {
    try {
      // Check permissions first
      const permissions = await Geolocation.checkPermissions();

      if (permissions.location !== "granted") {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location !== "granted") {
          return { success: false, error: "Location permission denied" };
        }
      }

      // Get position with high accuracy
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000, // Accept 1-minute old position
      });

      return {
        success: true,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        },
      };
    } catch (err: any) {
      console.error("Geolocation error:", err);

      let errorMessage = "Failed to get current location";
      if (err.message.includes("denied")) {
        errorMessage = "Location access denied";
      } else if (err.message.includes("timeout")) {
        errorMessage = "Location request timed out";
      } else if (err.message.includes("unavailable")) {
        errorMessage = "Location services unavailable";
      }

      return { success: false, error: errorMessage };
    }
  }

  // Watch position for continuous tracking
  async watchPosition(
    callback: (location: LocationData) => void
  ): Promise<string | null> {
    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        },
        (position, err) => {
          if (err) {
            console.error("Location watch error:", err);
            return;
          }

          if (position) {
            callback({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            });
          }
        }
      );

      return watchId;
    } catch (err) {
      console.error("Failed to start location watching:", err);
      return null;
    }
  }

  // Stop watching position
  async clearWatch(watchId: string) {
    try {
      await Geolocation.clearWatch({ id: watchId });
    } catch (err) {
      console.error("Failed to clear location watch:", err);
    }
  }
}

export const geolocationService = new GeolocationService();
