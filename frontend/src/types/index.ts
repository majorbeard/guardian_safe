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

export interface MobileUser {
  id: string;
  safe_id: string;
  username: string;
  driver_name?: string;
  is_active: boolean;
  created_by: string;
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
  tracknetics_device_id?: string; // Add this line
  assigned_to: string;
  last_update?: string;
  created_at: string;
  mobile_users?: MobileUser[];
}

export type SafeStatus = "active" | "inactive" | "maintenance" | "offline";

// Updated Trip interface with new optional fields
export interface Trip {
  trip: any;
  id: string;
  safe_id: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  pickup_address: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  delivery_address: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  status: TripStatus;
  scheduled_pickup: string;
  scheduled_delivery: string;
  priority?: TripPriority;
  special_instructions?: string;
  delivery_notes?: string;
  requires_signature?: boolean;
  recurring_config?: {
    frequency: "daily" | "weekly" | "monthly";
    end_date?: string;
    days_of_week?: number[];
  };
  recurring_parent_id?: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  tracking_token?: string;
  customer_tracking_enabled?: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type TripStatus = "pending" | "in_transit" | "delivered" | "cancelled";
export type TripPriority = "low" | "normal" | "high" | "urgent";

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}
