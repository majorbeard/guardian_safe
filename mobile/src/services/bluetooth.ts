import { BleClient } from "@capacitor-community/bluetooth-le";

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
      await BleClient.initialize();
      console.log("Bluetooth initialized");
      return { success: true };
    } catch (err: any) {
      console.error("Bluetooth init failed:", err);
      return { success: false, error: err.message };
    }
  }

  // Check if this phone matches hardcoded MAC
  async validatePhoneMAC(): Promise<boolean> {
    // Get device Bluetooth MAC address
    // Note: Android 6+ restricts direct MAC access, we'll use device ID
    //const phoneMac1 = import.meta.env.VITE_PHONE_MAC_1;
    //const phoneMac2 = import.meta.env.VITE_PHONE_MAC_2;

    // For now, we'll validate during connection to Pi
    // The Pi will validate the phone's MAC on its end
    return true;
  }

  // Scan for Pi Bluetooth device
  async scanForPi(): Promise<{
    success: boolean;
    device?: any;
    error?: string;
  }> {
    try {
      console.log("Scanning for Pi with MAC:", this.config.piMac);

      await BleClient.requestLEScan(
        { services: [PI_SERVICE_UUID] },
        (result) => {
          console.log("Device found:", result);
          // Check if this is our Pi by MAC address
          if (
            result.device.deviceId.toUpperCase() ===
            this.config.piMac.toUpperCase()
          ) {
            console.log("Found Pi");
            BleClient.stopLEScan();
            this.deviceId = result.device.deviceId;
          }
        }
      );

      // Scan for 10 seconds
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await BleClient.stopLEScan();

      if (this.deviceId) {
        return { success: true, device: { deviceId: this.deviceId } };
      } else {
        return { success: false, error: "Pi not found" };
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      return { success: false, error: err.message };
    }
  }

  // Connect to Pi
  async connectToPi(): Promise<{ success: boolean; error?: string }> {
    if (!this.deviceId) {
      return { success: false, error: "No Pi device found. Scan first." };
    }

    try {
      console.log("Connecting to Pi...");

      await BleClient.connect(this.deviceId, (deviceId) => {
        console.log("Disconnected from Pi:", deviceId);
        this.isConnected = false;
        this.deviceId = null;
      });

      this.isConnected = true;
      console.log("Connected to Pi");

      return { success: true };
    } catch (err: any) {
      console.error("Connection failed:", err);
      return { success: false, error: err.message };
    }
  }

  // Send OTP to Pi for verification
  async sendOTPToPi(
    otpCode: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isConnected || !this.deviceId) {
      return { success: false, error: "Not connected to Pi" };
    }

    try {
      // Convert OTP string to bytes
      const encoder = new TextEncoder();
      const otpBytes = encoder.encode(otpCode);

      // Write OTP to characteristic
      await BleClient.write(
        this.deviceId,
        PI_SERVICE_UUID,
        OTP_CHARACTERISTIC_UUID,
        new DataView(otpBytes.buffer)
      );

      console.log("OTP sent to Pi");
      return { success: true };
    } catch (err: any) {
      console.error("Failed to send OTP:", err);
      return { success: false, error: err.message };
    }
  }

  // Read Pi status (lock state, verification result)
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
      return { success: false, error: "Not connected to Pi" };
    }

    try {
      console.log("Reading Pi status...");

      const result = await BleClient.read(
        this.deviceId,
        PI_SERVICE_UUID,
        STATUS_CHARACTERISTIC_UUID
      );

      // Parse extended status bytes
      // [verified, lock_open, battery_percent, status_code, voltage_high, voltage_low]
      const statusArray = new Uint8Array(result.buffer);

      const verified = statusArray[0] === 1;
      const lockOpen = statusArray[1] === 1;
      const batteryPercent = statusArray[2];
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
      return { success: false, error: err.message };
    }
  }

  // Subscribe to Pi status changes
  async subscribeToPiStatus(
    callback: (status: { verified: boolean; lockOpen: boolean }) => void
  ) {
    if (!this.isConnected || !this.deviceId) {
      return { success: false, error: "Not connected to Pi" };
    }

    try {
      await BleClient.startNotifications(
        this.deviceId,
        PI_SERVICE_UUID,
        STATUS_CHARACTERISTIC_UUID,
        (value) => {
          const statusArray = new Uint8Array(value.buffer);
          const verified = statusArray[0] === 1;
          const lockOpen = statusArray[1] === 1;
          callback({ verified, lockOpen });
        }
      );

      return { success: true };
    } catch (err: any) {
      console.error("Failed to subscribe:", err);
      return { success: false, error: err.message };
    }
  }

  // Disconnect from Pi
  async disconnect() {
    if (this.deviceId) {
      try {
        await BleClient.disconnect(this.deviceId);
        this.isConnected = false;
        this.deviceId = null;
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
}

export const bluetoothService = new BluetoothService();
