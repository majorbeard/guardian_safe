export type UserRole = "owner" | "admin";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Safe {
  id: string;
  serial_number: string;
  device_hash: string;
  status: "active" | "inactive" | "maintenance" | "offline";
  battery_level: number;
  is_locked: boolean;
  tracking_device_id?: string;
  assigned_to: string;
  last_update?: string;
}

export interface Trip {
  id: string;
  safe_id: string;
  client_name: string;
  client_email?: string;
  pickup_address: string;
  delivery_address: string;
  status: "pending" | "in_transit" | "at_location" | "delivered" | "cancelled";
  scheduled_pickup: string;
  scheduled_delivery: string;
  special_instructions?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  requires_signature?: boolean;
  created_at: string;
  updated_at: string;
}

// Mobile-specific types
export interface BluetoothDevice {
  deviceId: string;
  name: string;
  connected: boolean;
}

export interface OTPRequest {
  trip_id: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: string;
}

export interface OTPResponse {
  success: boolean;
  otp?: string;
  error?: string;
  expires_at?: string;
}
