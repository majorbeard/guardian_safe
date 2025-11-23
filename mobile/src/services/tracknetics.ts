import { supabase } from "./supabase";

// Credentials are now handled server-side in Supabase Edge Function
// No need to store them client-side anymore

interface LoginResponse {
  state: string;
  userInfo?: {
    userID: string;
    userName: string;
    loginName: string;
    timeZone: string;
    address: string;
    cellPhone: string;
    key: string;
  };
}

interface DeviceInfo {
  id: string;
  sn: string; // IMEI
  name: string;
  status: string;
  speed?: string;
}

interface LocationData {
  state: string;
  positionTime?: string;
  lat?: string;
  lng?: string;
  speed?: string;
  course?: string;
  isStop?: string;
  stm?: string;
  isGPS?: string;
  status?: string;
}

class TrackneticsService {
  // Credentials removed - now handled server-side in Supabase Edge Function
  private currentSession: { userID?: string; key?: string } | null = null;

  constructor() {
    // No credentials needed client-side anymore
  }

  // Make API call through Supabase Edge Function proxy
  private async apiCall(
    operation: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "tracknetics-proxy",
        {
          body: {
            operation,
            params,
          },
        }
      );

      if (error) {
        console.error("Proxy call error:", error);
        throw new Error(`Proxy error: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error("API call failed:", err);
      throw err;
    }
  }

  // Login and get authentication key
  // Credentials are now handled by the Supabase Edge Function
  async login(): Promise<{ success: boolean; error?: string }> {
    try {
      // Edge Function handles credentials server-side
      const data: LoginResponse = await this.apiCall("Login", {});

      if (data.state === "0" && data.userInfo) {
        this.currentSession = {
          userID: data.userInfo.userID,
          key: data.userInfo.key,
        };
        return { success: true };
      } else {
        console.error("Tracknetics login failed:", data);
        const errorMessage = this.getErrorMessage(data.state);
        return { success: false, error: `Login failed: ${errorMessage}` };
      }
    } catch (error: any) {
      console.error("Tracknetics login error:", error);
      return {
        success: false,
        error: error.message || "Network error during login",
      };
    }
  }

  // Ensure we have a valid session
  private async ensureAuthenticated(): Promise<boolean> {
    if (!this.currentSession?.key) {
      const loginResult = await this.login();
      return loginResult.success;
    }
    return true;
  }

  // Get list of devices
  async getDeviceList(): Promise<{
    success: boolean;
    devices?: DeviceInfo[];
    error?: string;
  }> {
    if (
      !(await this.ensureAuthenticated()) ||
      !this.currentSession?.userID ||
      !this.currentSession?.key
    ) {
      return { success: false, error: "Authentication failed" };
    }

    try {
      const data = await this.apiCall("GetDeviceList", {
        ID: this.currentSession.userID,
        PageNo: 1,
        PageCount: 100,
        Key: this.currentSession.key,
      });

      if (data.state === "0") {
        return { success: true, devices: data.arr || [] };
      } else {
        const errorMessage = this.getErrorMessage(data.state);
        return {
          success: false,
          error: `Failed to get devices: ${errorMessage}`,
        };
      }
    } catch (error: any) {
      console.error("Error getting device list:", error);
      return {
        success: false,
        error: error.message || "Network error getting device list",
      };
    }
  }

  // Get real-time location for a device by ID
  async getDeviceLocation(
    deviceId: string
  ): Promise<{ success: boolean; location?: LocationData; error?: string }> {
    if (!(await this.ensureAuthenticated()) || !this.currentSession?.key) {
      return { success: false, error: "Authentication failed" };
    }

    try {
      const data: LocationData = await this.apiCall("GetTracking", {
        DeviceID: deviceId,
        TimeZones: "South Africa Standard Time",
        MapType: "google",
        Language: "en-us",
        Key: this.currentSession.key,
      });

      if (data.state === "0") {
        return { success: true, location: data };
      } else if (data.state === "2002") {
        return { success: false, error: "No location data available" };
      } else {
        const errorMessage = this.getErrorMessage(data.state);
        return {
          success: false,
          error: `Failed to get location: ${errorMessage}`,
        };
      }
    } catch (error: any) {
      console.error("Error getting device location:", error);
      return {
        success: false,
        error: error.message || "Network error getting location",
      };
    }
  }

  // Get location by device ID (simplified method for direct calls)
  async getLocationByDeviceId(deviceId: string): Promise<{
    success: boolean;
    location?: {
      lat: number;
      lng: number;
      accuracy: number;
      timestamp: number;
    };
    error?: string;
  }> {
    const locationResult = await this.getDeviceLocation(deviceId);

    if (!locationResult.success || !locationResult.location) {
      return { success: false, error: locationResult.error };
    }

    const location = locationResult.location;

    // Convert to standard format
    if (location.lat && location.lng) {
      const standardLocation = {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        accuracy: location.isGPS === "1" ? 10 : 100, // GPS vs LBS accuracy estimate
        timestamp: location.positionTime
          ? new Date(location.positionTime).getTime()
          : Date.now(),
      };

      return {
        success: true,
        location: standardLocation,
      };
    }

    return { success: false, error: "Invalid location data received" };
  }

  // Create geofence for delivery location
  async createDeliveryGeofence(
    deviceId: string,
    name: string,
    lat: number,
    lng: number,
    radiusMeters: number = 100
  ): Promise<{ success: boolean; geofenceId?: string; error?: string }> {
    if (!(await this.ensureAuthenticated()) || !this.currentSession?.key) {
      return { success: false, error: "Authentication failed" };
    }

    try {
      const data = await this.apiCall("SaveGeofence", {
        DeviceID: deviceId,
        GeofenceName: name,
        Remark: "Delivery Location",
        Lat: lat,
        Lng: lng,
        Radius: radiusMeters,
        GeofenceID: 0,
        MapType: "google",
        Key: this.currentSession.key,
      });

      if (data.state === "0") {
        return { success: true, geofenceId: data.geofenceID };
      } else {
        const errorMessage = this.getErrorMessage(data.state);
        return {
          success: false,
          error: `Failed to create geofence: ${errorMessage}`,
        };
      }
    } catch (error: any) {
      console.error("Error creating geofence:", error);
      return {
        success: false,
        error: error.message || "Network error creating geofence",
      };
    }
  }

  // Get device details by ID
  async getDeviceDetails(
    deviceId: string
  ): Promise<{ success: boolean; device?: any; error?: string }> {
    if (!(await this.ensureAuthenticated()) || !this.currentSession?.key) {
      return { success: false, error: "Authentication failed" };
    }

    try {
      const data = await this.apiCall("GetDeviceDetail", {
        DeviceID: deviceId,
        TimeZones: "South Africa Standard Time",
        Key: this.currentSession.key,
      });
      if (data.state === "0") {
        return { success: true, device: data };
      } else {
        const errorMessage = this.getErrorMessage(data.state);
        return {
          success: false,
          error: `Failed to get device details: ${errorMessage}`,
        };
      }
    } catch (error: any) {
      console.error("Error getting device details:", error);
      return {
        success: false,
        error: error.message || "Network error getting device details",
      };
    }
  }

  // Get device history/playback
  async getDeviceHistory(
    deviceId: string,
    startTime: string,
    endTime: string
  ): Promise<{ success: boolean; history?: any; error?: string }> {
    if (!(await this.ensureAuthenticated()) || !this.currentSession?.key) {
      return { success: false, error: "Authentication failed" };
    }

    try {
      const data = await this.apiCall("GetDevicesHistory", {
        DeviceID: deviceId,
        StartTime: startTime,
        EndTime: endTime,
        TimeZones: "South Africa Standard Time",
        ShowLBS: 0,
        MapType: "google",
        SelectCount: 1000,
        Key: this.currentSession.key,
      });
      if (data.state === "0") {
        return { success: true, history: data };
      } else {
        const errorMessage = this.getErrorMessage(data.state);
        return {
          success: false,
          error: `Failed to get device history: ${errorMessage}`,
        };
      }
    } catch (error: any) {
      console.error("Error getting device history:", error);
      return {
        success: false,
        error: error.message || "Network error getting device history",
      };
    }
  }

  // Logout
  async logout(): Promise<void> {
    if (this.currentSession?.userID && this.currentSession?.key) {
      try {
        await this.apiCall("Exit", {
          ID: this.currentSession.userID,
          Key: this.currentSession.key,
        });
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }
    this.currentSession = null;
  }

  // Helper to decode Tracknetics error states
  private getErrorMessage(state: string): string {
    const errorCodes: Record<string, string> = {
      "0": "Success",
      "1001": "Parameter error",
      "1002": "Program error",
      "2001": "Username or password error",
      "2002": "No result",
      "2003": "Car number already exists",
      "2004": "Fail to modify",
      "2005": "Modify success",
      "2020": "Username already exists",
      "2021": "It has sub account, cannot be deleted",
      "2022": "It has device, cannot be deleted",
      "2023": "Username does not exist",
      "3001": "KEY incorrect",
      "3004": "Maintenance...",
    };

    return errorCodes[state] || `Unknown error (${state})`;
  }
}

export const trackneticsService = new TrackneticsService();
