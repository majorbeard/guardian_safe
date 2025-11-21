import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.guardiansafe.mobile",
  appName: "guardian-safe-mobile",
  webDir: "dist",
  server: {
    url: "https://guardian-safe-1uv582r1n-majorbeards-projects.vercel.app",
    hostname: "guardian-safe-1uv582r1n-majorbeards-projects.vercel.app",

    androidScheme: "https",
    cleartext: true, // Keeps it permissive for the Alpha
    allowNavigation: [
      "guardian-safe-1uv582r1n-majorbeards-projects.vercel.app",
    ],
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
