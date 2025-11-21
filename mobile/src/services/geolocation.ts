interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

class GeolocationService {
  // Check if we're running in a Capacitor environment
  private isCapacitorAvailable(): boolean {
    return !!(window as any).Capacitor;
  }

  // Get current position with high accuracy
  async getCurrentPosition(): Promise<{
    success: boolean;
    location?: LocationData;
    error?: string;
  }> {
    try {
      console.log(
        "Getting location - is Capacitor available?",
        this.isCapacitorAvailable()
      );

      if (this.isCapacitorAvailable()) {
        return await this.getCapacitorLocation();
      } else {
        return await this.getBrowserLocation();
      }
    } catch (err: any) {
      console.error("Geolocation error:", err);
      return { success: false, error: "Failed to get current location" };
    }
  }

  // Use Capacitor geolocation (for mobile apps)
  private async getCapacitorLocation(): Promise<{
    success: boolean;
    location?: LocationData;
    error?: string;
  }> {
    try {
      // Import Capacitor dynamically to avoid errors in browser
      const { Geolocation } = await import("@capacitor/geolocation");

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
        maximumAge: 60000,
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
      console.error("Capacitor geolocation error:", err);

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

  // Use browser geolocation API (for web testing)
  private async getBrowserLocation(): Promise<{
    success: boolean;
    location?: LocationData;
    error?: string;
  }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          success: false,
          error: "Geolocation is not supported by this browser",
        });
        return;
      }

      console.log("Using browser geolocation...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Browser location success:", position.coords);
          resolve({
            success: true,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            },
          });
        },
        (error) => {
          console.error("Browser location error:", error);

          let errorMessage = "Failed to get current location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Location access denied by user";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information is unavailable";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out";
              break;
          }

          resolve({ success: false, error: errorMessage });
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    });
  }

  // Watch position for continuous tracking
  async watchPosition(
    callback: (location: LocationData) => void
  ): Promise<string | null> {
    try {
      if (this.isCapacitorAvailable()) {
        const { Geolocation } = await import("@capacitor/geolocation");

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
      } else {
        // Browser fallback
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            callback({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            });
          },
          (error) => {
            console.error("Browser location watch error:", error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000,
          }
        );

        return watchId.toString();
      }
    } catch (err) {
      console.error("Failed to start location watching:", err);
      return null;
    }
  }

  // Stop watching position
  async clearWatch(watchId: string) {
    try {
      if (this.isCapacitorAvailable()) {
        const { Geolocation } = await import("@capacitor/geolocation");
        await Geolocation.clearWatch({ id: watchId });
      } else {
        navigator.geolocation.clearWatch(parseInt(watchId));
      }
    } catch (err) {
      console.error("Failed to clear location watch:", err);
    }
  }
}

export const geolocationService = new GeolocationService();
