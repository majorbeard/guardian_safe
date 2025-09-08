export type UserRole = "owner" | "admin";

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  created_by?: string;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Safe {
  id: string;
  serial_number: string;
  device_hash: string;
  status: SafeStatus;
  battery_level: number;
  is_locked: boolean;
  tracking_device_id?: string;
  assigned_to: string;
  last_update?: string;
  created_at: string;
}

export type SafeStatus = "active" | "inactive" | "maintenance" | "offline";

export interface Trip {
  id: string;
  safe_id: string;
  client_name: string;
  pickup_address: string;
  delivery_address: string;
  status: TripStatus;
  scheduled_pickup: string;
  scheduled_delivery: string;
  instructions?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type TripStatus = "pending" | "in_transit" | "delivered" | "cancelled";

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}
