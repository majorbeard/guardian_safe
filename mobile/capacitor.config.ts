import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.guardiansafe.mobile",
  appName: "Guardian Safe Driver",
  webDir: "dist",
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
