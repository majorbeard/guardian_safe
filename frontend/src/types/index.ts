// User and Authentication Types
export type UserRole = "admin" | "courier" | "auditor";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

// Safe and Hardware Types
export interface Safe {
  id: string;
  serialNumber: string;
  status: SafeStatus;
  batteryLevel: number;
  isLocked: boolean;
  isTampered: boolean;
  location: {
    lat: number;
    lng: number;
    lastUpdate: Date;
  };
  assignedTrip?: string;
  lastMaintenance?: Date;
  firmwareVersion: string;
}

export type SafeStatus =
  | "active"
  | "inactive"
  | "maintenance"
  | "error"
  | "offline";

export interface SafeEvent {
  id: string;
  safeId: string;
  type: "unlock" | "lock" | "tamper" | "battery_low" | "gps_update" | "error";
  timestamp: Date;
  data: Record<string, any>;
  severity: "low" | "medium" | "high" | "critical";
}

// Trip Management Types
export interface Trip {
  clientEmail: any;
  priority: string;
  id: string;
  clientName: string;
  pickupAddress: string;
  deliveryAddress: string;
  assignedCourier: string;
  assignedSafe: string;
  status: TripStatus;
  createdAt: Date;
  scheduledPickup: Date;
  scheduledDelivery: Date;
  actualPickup?: Date;
  actualDelivery?: Date;
  otpCode?: string;
  instructions?: string;
  value?: number;
}

export type TripStatus =
  | "pending"
  | "assigned"
  | "in_transit"
  | "delivered"
  | "cancelled"
  | "failed";

// Real-time WebSocket Types
export interface WebSocketMessage {
  type: "safe_update" | "trip_update" | "alert" | "heartbeat";
  data: any;
  timestamp: Date;
}

export interface SafeUpdate {
  safeId: string;
  batteryLevel?: number;
  location?: { lat: number; lng: number };
  status?: SafeStatus;
  isLocked?: boolean;
  isTampered?: boolean;
}

export interface Alert {
  id: string;
  type: "tamper" | "battery_low" | "offline" | "emergency";
  safeId: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  severity: "low" | "medium" | "high" | "critical";
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Audit and Reporting Types
export interface AuditLog {
  id: string;
  userId: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: Date;
  ipAddress?: string;
  details: Record<string, any>;
}

export interface SystemStats {
  totalSafes: number;
  activeSafes: number;
  offlineSafes: number;
  activeTrips: number;
  completedTripsToday: number;
  averageBatteryLevel: number;
  criticalAlerts: number;
}
