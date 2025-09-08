import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types (will be auto-generated from Supabase CLI)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          role: "owner" | "admin";
          created_by: string | null;
          must_change_password: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          role: "owner" | "admin";
          created_by?: string | null;
          must_change_password?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          role?: "owner" | "admin";
          created_by?: string | null;
          must_change_password?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      safes: {
        Row: {
          id: string;
          serial_number: string;
          device_hash: string;
          status: "active" | "inactive" | "maintenance" | "offline";
          battery_level: number;
          is_locked: boolean;
          tracking_device_id: string | null;
          assigned_to: string;
          last_update: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          serial_number: string;
          device_hash: string;
          status?: "active" | "inactive" | "maintenance" | "offline";
          battery_level?: number;
          is_locked?: boolean;
          tracking_device_id?: string | null;
          assigned_to: string;
          last_update?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          serial_number?: string;
          device_hash?: string;
          status?: "active" | "inactive" | "maintenance" | "offline";
          battery_level?: number;
          is_locked?: boolean;
          tracking_device_id?: string | null;
          assigned_to?: string;
          last_update?: string | null;
          created_at?: string;
        };
      };
      trips: {
        Row: {
          id: string;
          safe_id: string;
          client_name: string;
          pickup_address: string;
          delivery_address: string;
          status: "pending" | "in_transit" | "delivered" | "cancelled";
          scheduled_pickup: string;
          scheduled_delivery: string;
          instructions: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          safe_id: string;
          client_name: string;
          pickup_address: string;
          delivery_address: string;
          status?: "pending" | "in_transit" | "delivered" | "cancelled";
          scheduled_pickup: string;
          scheduled_delivery: string;
          instructions?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          safe_id?: string;
          client_name?: string;
          pickup_address?: string;
          delivery_address?: string;
          status?: "pending" | "in_transit" | "delivered" | "cancelled";
          scheduled_pickup?: string;
          scheduled_delivery?: string;
          instructions?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
