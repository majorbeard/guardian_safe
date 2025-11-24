import { BleClient } from "@capacitor-community/bluetooth-le";
import { mobileAuthService } from "./auth";

// Service UUIDs for Pi communication
const PI_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const OTP_CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const STATUS_CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a9";

interface BluetoothConfig {
  phoneMac: string;
  piMac: string;
  trackerMac: string;
}

class BluetoothService {
  private config: BluetoothConfig;
  private isConnected = false;
  private deviceId: string | null = null;
  private connectionAttempts = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 3;
  private reconnectTimer: number | null = null;

  constructor() {
    // Load MAC addresses from environment
    this.config = {
      phoneMac: import.meta.env.VITE_PHONE_MAC_1 || "",
      piMac: import.meta.env.VITE_PI_MAC || "",
      trackerMac: import.meta.env.VITE_TRACKER_IMEI || "",
    };
  }

  // Initialize Bluetooth
  async initialize() {
    try {
      // Check if user is authenticated
      const sessionToken = await mobileAuthService.getSessionToken();
      if (!sessionToken) {
        console.error("Cannot initialize Bluetooth: User not authenticated");
        return { success: false, error: "Authentication required" };
      }

      await BleClient.initialize();
      console.log("Bluetooth initialized");
      return { success: true };
    } catch (err: any) {
      console.error("Bluetooth init failed:", err);
      return { success: false, error: err.message };
    }
  }

  // Validate phone MAC (optional security check)
  async validatePhoneMAC(): Promise<boolean> {
    // In production, you could implement device fingerprinting here
    // For now, we trust the authenticated session
    return true;
  }

  // Scan for Pi Bluetooth device with timeout
  async scanForPi(timeoutMs: number = 10000): Promise<{
    success: boolean;
    device?: any;
    error?: string;
  }> {
    try {
      console.log("Scanning for Pi with MAC:", this.config.piMac);

      let foundDevice = false;

      await BleClient.requestLEScan(
        { services: [PI_SERVICE_UUID] },
        (result) => {
          console.log("Device found:", result);

          // Check if this is our Pi by MAC address or name
          const deviceMac = result.device.deviceId.toUpperCase();
          const configMac = this.config.piMac.toUpperCase();

          if (
            deviceMac === configMac ||
            result.localName?.includes("GuardianSafe")
          ) {
            console.log("Found Guardian Safe Pi");
            BleClient.stopLEScan();
            this.deviceId = result.device.deviceId;
            foundDevice = true;
          }
        }
      );

      // Wait for scan timeout
      await new Promise((resolve) => setTimeout(resolve, timeoutMs));

      if (!foundDevice) {
        await BleClient.stopLEScan();
      }

      if (this.deviceId) {
        return { success: true, device: { deviceId: this.deviceId } };
      } else {
        return {
          success: false,
          error:
            "Guardian Safe not found. Make sure you are near the safe and it is powered on.",
        };
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      await BleClient.stopLEScan().catch(() => {});
      return { success: false, error: err.message };
    }
  }

  // Connect to Pi with retry logic
  async connectToPi(): Promise<{ success: boolean; error?: string }> {
    if (!this.deviceId) {
      return { success: false, error: "No Pi device found. Scan first." };
    }

    // Check connection attempts
    if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
      return {
        success: false,
        error: "Maximum connection attempts reached. Please restart the app.",
      };
    }

    this.connectionAttempts++;

    try {
      console.log(
        `Connecting to Pi... (attempt ${this.connectionAttempts}/${this.MAX_CONNECTION_ATTEMPTS})`
      );

      await BleClient.connect(this.deviceId, (deviceId) => {
        console.log("Disconnected from Pi:", deviceId);
        this.handleDisconnection();
      });

      this.isConnected = true;
      this.connectionAttempts = 0; // Reset on success
      console.log("Connected to Pi");

      return { success: true };
    } catch (err: any) {
      console.error("Connection failed:", err);
      return { success: false, error: err.message };
    }
  }

  // Handle unexpected disconnection
  private handleDisconnection() {
    this.isConnected = false;
    console.warn("Bluetooth connection lost");

    // Attempt to reconnect after delay
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      console.log("Attempting to reconnect...");
      const result = await this.connectToPi();
      if (!result.success) {
        console.error("Reconnection failed:", result.error);
      }
    }, 5000) as unknown as number;
  }

  // Send OTP to Pi for verification with validation
  async sendOTPToPi(
    otpCode: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConnected || !this.deviceId) {
      return { success: false, error: "Not connected to safe" };
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(otpCode)) {
      return { success: false, error: "Invalid OTP format" };
    }

    try {
      console.log("Sending OTP to Pi...");

      // Convert OTP string to bytes
      const encoder = new TextEncoder();
      const otpBytes = encoder.encode(otpCode);

      // Write OTP to characteristic with timeout
      const writePromise = BleClient.write(
        this.deviceId,
        PI_SERVICE_UUID,
        OTP_CHARACTERISTIC_UUID,
        new DataView(otpBytes.buffer)
      );

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Write timeout")), 10000)
      );

      await Promise.race([writePromise, timeout]);

      console.log("OTP sent to Pi successfully");
      return { success: true };
    } catch (err: any) {
      console.error("Failed to send OTP:", err);

      // If write failed, connection might be lost
      if (
        err.message?.includes("disconnected") ||
        err.message?.includes("timeout")
      ) {
        this.isConnected = false;
      }

      return { success: false, error: err.message };
    }
  }

  // Read Pi status with enhanced error handling
  async readPiStatus(): Promise<{
    success: boolean;
    status?: {
      verified: boolean;
      lockOpen: boolean;
      batteryPercent: number;
      safeStatus: "inactive" | "active" | "maintenance" | "offline";
      voltage: number;
    };
    error?: string;
  }> {
    if (!this.isConnected || !this.deviceId) {
      return { success: false, error: "Not connected to safe" };
    }

    try {
      console.log("Reading Pi status...");

      const readPromise = BleClient.read(
        this.deviceId,
        PI_SERVICE_UUID,
        STATUS_CHARACTERISTIC_UUID
      );

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Read timeout")), 10000)
      );

      const result = (await Promise.race([readPromise, timeout])) as DataView;

      // Parse status bytes
      const statusArray = new Uint8Array(result.buffer);

      // Validate response length - expecting 6 bytes
      if (statusArray.length < 6) {
        return {
          success: false,
          error: "Invalid status response from safe",
        };
      }

      const verified = statusArray[0] === 1;
      const lockOpen = statusArray[1] === 1;
      const batteryPercent = Math.min(100, Math.max(0, statusArray[2]));
      const statusCode = statusArray[3];

      // Reconstruct voltage from two bytes
      const voltageInt = (statusArray[4] << 8) | statusArray[5];
      const voltage = voltageInt / 10.0;

      // Map status code to string
      const statusMap: Record<
        number,
        "inactive" | "active" | "maintenance" | "offline"
      > = {
        0: "inactive",
        1: "active",
        2: "maintenance",
        3: "offline",
      };
      const safeStatus = statusMap[statusCode] || "active";

      console.log("Pi status:", {
        verified,
        lockOpen,
        batteryPercent,
        safeStatus,
        voltage: `${voltage.toFixed(2)}V`,
      });

      return {
        success: true,
        status: {
          verified,
          lockOpen,
          batteryPercent,
          safeStatus,
          voltage,
        },
      };
    } catch (err: any) {
      console.error("Failed to read status:", err);

      // Check if connection was lost
      if (
        err.message?.includes("disconnected") ||
        err.message?.includes("timeout")
      ) {
        this.isConnected = false;
      }

      return { success: false, error: err.message };
    }
  }

  // Subscribe to Pi status changes with reconnection
  async subscribeToPiStatus(
    callback: (status: {
      verified: boolean;
      lockOpen: boolean;
      batteryPercent: number;
      voltage: number;
    }) => void
  ) {
    if (!this.isConnected || !this.deviceId) {
      return { success: false, error: "Not connected to safe" };
    }

    try {
      await BleClient.startNotifications(
        this.deviceId,
        PI_SERVICE_UUID,
        STATUS_CHARACTERISTIC_UUID,
        (value) => {
          try {
            const statusArray = new Uint8Array(value.buffer);

            // Expecting 6 bytes: [verified, lock_open, battery, status, voltage_high, voltage_low]
            if (statusArray.length >= 6) {
              const verified = statusArray[0] === 1;
              const lockOpen = statusArray[1] === 1;
              const batteryPercent = Math.min(100, Math.max(0, statusArray[2]));
              const voltageInt = (statusArray[4] << 8) | statusArray[5];
              const voltage = voltageInt / 10.0;

              console.log("Status notification received:", {
                verified,
                lockOpen,
                batteryPercent,
                voltage: `${voltage.toFixed(1)}V`,
              });
              callback({ verified, lockOpen, batteryPercent, voltage });
            } else {
              console.warn(
                "Invalid status notification length:",
                statusArray.length
              );
            }
          } catch (parseError) {
            console.error("Error parsing notification:", parseError);
          }
        }
      );

      console.log("Subscribed to Pi status updates");
      return { success: true };
    } catch (err: any) {
      console.error("Failed to subscribe:", err);
      return { success: false, error: err.message };
    }
  }

  // Disconnect from Pi with cleanup
  async disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.deviceId) {
      try {
        await BleClient.disconnect(this.deviceId);
        this.isConnected = false;
        this.deviceId = null;
        this.connectionAttempts = 0;
        console.log("Disconnected from Pi");
      } catch (err) {
        console.error("Disconnect error:", err);
      }
    }
  }

  // Get connection status
  isConnectedToPi(): boolean {
    return this.isConnected;
  }

  // Get device configuration
  getConfig(): BluetoothConfig {
    return this.config;
  }

  // Reset connection state (for retry)
  resetConnection() {
    this.connectionAttempts = 0;
    this.deviceId = null;
    this.isConnected = false;
  }
}

export const bluetoothService = new BluetoothService();
