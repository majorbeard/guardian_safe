import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.guardiansafe.mobile",
  appName: "guardian-safe-mobile",
  webDir: "dist",
  server: {
    androidScheme: "https",
    // Add this for development
    url: "http://localhost:5174", // Updated port
    cleartext: true,
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Scanning for Guardian Safe...",
        cancel: "Cancel",
        availableDevices: "Available Safes",
        noDeviceFound: "No Guardian Safe found",
      },
    },
    Geolocation: {
      permissions: {
        location: "always",
      },
    },
  },
};

export default config;
