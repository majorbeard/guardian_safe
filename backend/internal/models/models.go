package models

import (
    "time"
)

type User struct {
    ID        string    `json:"id" db:"id"`
    Username  string    `json:"username" db:"username"`
    Password  string    `json:"-" db:"password"` // Never send password in JSON
    Role      string    `json:"role" db:"role"`
    IsActive  bool      `json:"isActive" db:"is_active"`
    CreatedAt time.Time `json:"createdAt" db:"created_at"`
    LastLogin *time.Time `json:"lastLogin,omitempty" db:"last_login"`
}

type Safe struct {
    ID                string     `json:"id" db:"id"`
    SerialNumber      string     `json:"serialNumber" db:"serial_number"`
    Status            string     `json:"status" db:"status"`
    BatteryLevel      int        `json:"batteryLevel" db:"battery_level"`
    IsLocked          bool       `json:"isLocked" db:"is_locked"`
    IsTampered        bool       `json:"isTampered" db:"is_tampered"`
    LocationLat       float64    `json:"-" db:"location_lat"`
    LocationLng       float64    `json:"-" db:"location_lng"`
    LocationLastUpdate time.Time `json:"-" db:"location_last_update"`
    AssignedTrip      *string    `json:"assignedTrip,omitempty" db:"assigned_trip"`
    LastMaintenance   *time.Time `json:"lastMaintenance,omitempty" db:"last_maintenance"`
    FirmwareVersion   string     `json:"firmwareVersion" db:"firmware_version"`
    CreatedAt         time.Time  `json:"createdAt" db:"created_at"`
    UpdatedAt         time.Time  `json:"updatedAt" db:"updated_at"`
}

// Custom JSON marshaling for Location
type SafeLocation struct {
    Lat        float64   `json:"lat"`
    Lng        float64   `json:"lng"`
    LastUpdate time.Time `json:"lastUpdate"`
}

func (s *Safe) GetLocation() SafeLocation {
    return SafeLocation{
        Lat:        s.LocationLat,
        Lng:        s.LocationLng,
        LastUpdate: s.LocationLastUpdate,
    }
}

type SafeResponse struct {
    *Safe
    Location SafeLocation `json:"location"`
}

func (s *Safe) ToResponse() SafeResponse {
    return SafeResponse{
        Safe:     s,
        Location: s.GetLocation(),
    }
}

type Trip struct {
    ID                string     `json:"id" db:"id"`
    ClientName        string     `json:"clientName" db:"client_name"`
    ClientEmail       string     `json:"clientEmail,omitempty" db:"client_email"`
    ClientPhone       string     `json:"clientPhone,omitempty" db:"client_phone"`
    PickupAddress     string     `json:"pickupAddress" db:"pickup_address"`
    DeliveryAddress   string     `json:"deliveryAddress" db:"delivery_address"`
    AssignedCourier   string     `json:"assignedCourier" db:"assigned_courier"`
    AssignedSafe      string     `json:"assignedSafe" db:"assigned_safe"`
    Status            string     `json:"status" db:"status"`
    Priority          string     `json:"priority" db:"priority"`
    Value             *float64   `json:"value,omitempty" db:"value"`
    Instructions      string     `json:"instructions,omitempty" db:"instructions"`
    OTPCode           *string    `json:"otpCode,omitempty" db:"otp_code"`
    CreatedAt         time.Time  `json:"createdAt" db:"created_at"`
    UpdatedAt         time.Time  `json:"updatedAt" db:"updated_at"`
    ScheduledPickup   time.Time  `json:"scheduledPickup" db:"scheduled_pickup"`
    ScheduledDelivery time.Time  `json:"scheduledDelivery" db:"scheduled_delivery"`
    ActualPickup      *time.Time `json:"actualPickup,omitempty" db:"actual_pickup"`
    ActualDelivery    *time.Time `json:"actualDelivery,omitempty" db:"actual_delivery"`
}

type AuditLog struct {
    ID         string                 `json:"id" db:"id"`
    UserID     string                 `json:"userId" db:"user_id"`
    UserRole   string                 `json:"userRole" db:"user_role"`
    Action     string                 `json:"action" db:"action"`
    Resource   string                 `json:"resource" db:"resource"`
    ResourceID *string                `json:"resourceId,omitempty" db:"resource_id"`
    IPAddress  *string                `json:"ipAddress,omitempty" db:"ip_address"`
    Details    map[string]interface{} `json:"details" db:"details"`
    Timestamp  time.Time              `json:"timestamp" db:"timestamp"`
}

type Alert struct {
    ID           string    `json:"id" db:"id"`
    Type         string    `json:"type" db:"type"`
    SafeID       string    `json:"safeId" db:"safe_id"`
    Message      string    `json:"message" db:"message"`
    Severity     string    `json:"severity" db:"severity"`
    Acknowledged bool      `json:"acknowledged" db:"acknowledged"`
    Timestamp    time.Time `json:"timestamp" db:"timestamp"`
}

// Request/Response types
type LoginRequest struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
}

type ChangePasswordRequest struct {
    CurrentPassword string `json:"currentPassword" binding:"required"`
    NewPassword     string `json:"newPassword" binding:"required"`
}

type CreateUserRequest struct {
    Username string `json:"username" binding:"required"`
    Password string `json:"password" binding:"required"`
    Role     string `json:"role" binding:"required"`
    IsActive bool   `json:"isActive"`
}

type RegisterSafeRequest struct {
    SerialNumber string `json:"serialNumber" binding:"required"`
}

type UnlockSafeRequest struct {
    OTPCode string `json:"otpCode" binding:"required"`
}

type CreateTripRequest struct {
    ClientName        string     `json:"clientName" binding:"required"`
    ClientEmail       string     `json:"clientEmail,omitempty"`
    ClientPhone       string     `json:"clientPhone,omitempty"`
    PickupAddress     string     `json:"pickupAddress" binding:"required"`
    DeliveryAddress   string     `json:"deliveryAddress" binding:"required"`
    AssignedCourier   string     `json:"assignedCourier" binding:"required"`
    AssignedSafe      string     `json:"assignedSafe" binding:"required"`
    Priority          string     `json:"priority"`
    Value             *float64   `json:"value,omitempty"`
    Instructions      string     `json:"instructions,omitempty"`
    ScheduledPickup   time.Time  `json:"scheduledPickup" binding:"required"`
    ScheduledDelivery time.Time  `json:"scheduledDelivery" binding:"required"`
}

type AssignTripRequest struct {
    CourierID string `json:"courierId" binding:"required"`
    SafeID    string `json:"safeId" binding:"required"`
}

type PaginatedResponse struct {
    Data     interface{} `json:"data"`
    Total    int         `json:"total"`
    Page     int         `json:"page"`
    Limit    int         `json:"limit"`
    HasMore  bool        `json:"hasMore"`
}