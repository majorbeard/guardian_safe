package handlers

import (
    "database/sql"
    "fmt"
    "net/http"
    "strconv"
    "strings"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"

    "guardian-safe-backend/internal/models"
    "guardian-safe-backend/internal/services"
)

type TripsHandler struct {
    db       *sql.DB
    realtime *services.RealtimeService
    audit    *services.AuditService
}

func NewTripsHandler(db *sql.DB, realtime *services.RealtimeService, audit *services.AuditService) *TripsHandler {
    return &TripsHandler{
        db:       db,
        realtime: realtime,
        audit:    audit,
    }
}

func (h *TripsHandler) GetTrips(c *gin.Context) {
    // Parse pagination parameters
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
    if page < 1 {
        page = 1
    }
    if limit < 1 || limit > 100 {
        limit = 20
    }

    offset := (page - 1) * limit

    // Get total count
    var total int
    err := h.db.QueryRow("SELECT COUNT(*) FROM trips").Scan(&total)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count trips"})
        return
    }

    // Get trips with pagination
    rows, err := h.db.Query(`
        SELECT id, client_name, client_email, client_phone, pickup_address, delivery_address,
               assigned_courier, assigned_safe, status, priority, value, instructions, otp_code,
               created_at, updated_at, scheduled_pickup, scheduled_delivery, actual_pickup, actual_delivery
        FROM trips
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `, limit, offset)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trips"})
        return
    }
    defer rows.Close()

    var trips []models.Trip
    for rows.Next() {
        var trip models.Trip
        err := rows.Scan(
            &trip.ID, &trip.ClientName, &trip.ClientEmail, &trip.ClientPhone,
            &trip.PickupAddress, &trip.DeliveryAddress, &trip.AssignedCourier,
            &trip.AssignedSafe, &trip.Status, &trip.Priority, &trip.Value,
            &trip.Instructions, &trip.OTPCode, &trip.CreatedAt, &trip.UpdatedAt,
            &trip.ScheduledPickup, &trip.ScheduledDelivery, &trip.ActualPickup, &trip.ActualDelivery,
        )
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse trip data"})
            return
        }

        trips = append(trips, trip)
    }

    hasMore := offset+limit < total

    response := models.PaginatedResponse{
        Data:    trips,
        Total:   total,
        Page:    page,
        Limit:   limit,
        HasMore: hasMore,
    }

    c.JSON(http.StatusOK, response)
}

func (h *TripsHandler) CreateTrip(c *gin.Context) {
    var req models.CreateTripRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
        return
    }

    // Validate assigned safe exists and is available
    var safeExists bool
    var safeAssigned *string
    err := h.db.QueryRow(`
        SELECT EXISTS(SELECT 1 FROM safes WHERE id = $1 AND status = 'active'),
               assigned_trip FROM safes WHERE id = $1
    `, req.AssignedSafe).Scan(&safeExists, &safeAssigned)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }
    
    if !safeExists {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Assigned safe not found or not active"})
        return
    }
    
    if safeAssigned != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Safe is already assigned to another trip"})
        return
    }

    // Create new trip
    id := uuid.New().String()
    priority := req.Priority
    if priority == "" {
        priority = "normal"
    }

    _, err = h.db.Exec(`
        INSERT INTO trips (
            id, client_name, client_email, client_phone, pickup_address, delivery_address,
            assigned_courier, assigned_safe, status, priority, value, instructions,
            scheduled_pickup, scheduled_delivery
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13)
    `, id, req.ClientName, req.ClientEmail, req.ClientPhone, req.PickupAddress,
        req.DeliveryAddress, req.AssignedCourier, req.AssignedSafe, priority,
        req.Value, req.Instructions, req.ScheduledPickup, req.ScheduledDelivery)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create trip"})
        return
    }

    // Update safe to assign this trip
    _, err = h.db.Exec("UPDATE safes SET assigned_trip = $1 WHERE id = $2", id, req.AssignedSafe)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign safe to trip"})
        return
    }

    // Fetch the created trip
    var trip models.Trip
    err = h.db.QueryRow(`
        SELECT id, client_name, client_email, client_phone, pickup_address, delivery_address,
               assigned_courier, assigned_safe, status, priority, value, instructions, otp_code,
               created_at, updated_at, scheduled_pickup, scheduled_delivery, actual_pickup, actual_delivery
        FROM trips WHERE id = $1
    `, id).Scan(
        &trip.ID, &trip.ClientName, &trip.ClientEmail, &trip.ClientPhone,
        &trip.PickupAddress, &trip.DeliveryAddress, &trip.AssignedCourier,
        &trip.AssignedSafe, &trip.Status, &trip.Priority, &trip.Value,
        &trip.Instructions, &trip.OTPCode, &trip.CreatedAt, &trip.UpdatedAt,
        &trip.ScheduledPickup, &trip.ScheduledDelivery, &trip.ActualPickup, &trip.ActualDelivery,
    )
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch created trip"})
        return
    }

    // Log the action
    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")
    h.audit.LogAction(
        userID.(string), userRole.(string), "create", "trip", &trip.ID,
        c.ClientIP(), map[string]interface{}{
            "client_name": req.ClientName,
            "courier": req.AssignedCourier,
            "safe_id": req.AssignedSafe,
        },
    )

    // Broadcast trip creation
    h.realtime.BroadcastTripUpdate(trip.ID, trip)
    h.realtime.BroadcastSystemNotification("New Trip", "Trip created for "+req.ClientName, "info")

    c.JSON(http.StatusCreated, trip)
}

func (h *TripsHandler) UpdateTrip(c *gin.Context) {
    id := c.Param("id")
    
    var updates map[string]interface{}
    if err := c.ShouldBindJSON(&updates); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
        return
    }

    // Build dynamic update query
    setParts := []string{}
    args := []interface{}{}
    argCount := 0

    allowedFields := map[string]bool{
        "client_name": true, "client_email": true, "client_phone": true,
        "pickup_address": true, "delivery_address": true, "assigned_courier": true,
        "status": true, "priority": true, "value": true, "instructions": true,
        "otp_code": true, "actual_pickup": true, "actual_delivery": true,
    }

    for field, value := range updates {
        if !allowedFields[field] {
            continue
        }
        
        argCount++
        setParts = append(setParts, field+" = $"+strconv.Itoa(argCount))
        args = append(args, value)
    }

    if len(setParts) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
        return
    }

    // Add updated_at
    argCount++
    setParts = append(setParts, "updated_at = $"+strconv.Itoa(argCount))
    args = append(args, time.Now())

    // Add WHERE clause
    argCount++
    args = append(args, id)

    query := "UPDATE trips SET " + strings.Join(setParts, ", ") + " WHERE id = $" + strconv.Itoa(argCount)
    
    _, err := h.db.Exec(query, args...)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update trip"})
        return
    }

    // Fetch updated trip
    var trip models.Trip
    err = h.db.QueryRow(`
        SELECT id, client_name, client_email, client_phone, pickup_address, delivery_address,
               assigned_courier, assigned_safe, status, priority, value, instructions, otp_code,
               created_at, updated_at, scheduled_pickup, scheduled_delivery, actual_pickup, actual_delivery
        FROM trips WHERE id = $1
    `, id).Scan(
        &trip.ID, &trip.ClientName, &trip.ClientEmail, &trip.ClientPhone,
        &trip.PickupAddress, &trip.DeliveryAddress, &trip.AssignedCourier,
        &trip.AssignedSafe, &trip.Status, &trip.Priority, &trip.Value,
        &trip.Instructions, &trip.OTPCode, &trip.CreatedAt, &trip.UpdatedAt,
        &trip.ScheduledPickup, &trip.ScheduledDelivery, &trip.ActualPickup, &trip.ActualDelivery,
    )
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated trip"})
        return
    }

    // If trip is completed or cancelled, free up the safe
    if trip.Status == "delivered" || trip.Status == "cancelled" || trip.Status == "failed" {
        _, err = h.db.Exec("UPDATE safes SET assigned_trip = NULL WHERE assigned_trip = $1", id)
        if err != nil {
            // Log error but don't fail the update
            fmt.Printf("Failed to free up safe for trip %s: %v\n", id, err)
        }
    }

    // Log the action
    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")
    h.audit.LogAction(
        userID.(string), userRole.(string), "update", "trip", &trip.ID,
        c.ClientIP(), updates,
    )

    // Broadcast trip update
    h.realtime.BroadcastTripUpdate(trip.ID, trip)

    // Send status-specific notifications
    if newStatus, ok := updates["status"].(string); ok {
        switch newStatus {
        case "delivered":
            h.realtime.BroadcastSystemNotification("Trip Delivered", "Trip for "+trip.ClientName+" delivered successfully", "success")
        case "failed":
            h.realtime.BroadcastSystemNotification("Trip Failed", "Trip for "+trip.ClientName+" encountered an error", "error")
        case "cancelled":
            h.realtime.BroadcastSystemNotification("Trip Cancelled", "Trip for "+trip.ClientName+" was cancelled", "warning")
        }
    }

    c.JSON(http.StatusOK, trip)
}

func (h *TripsHandler) AssignTrip(c *gin.Context) {
    id := c.Param("id")
    
    var req models.AssignTripRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
        return
    }

    // Update trip assignment
    _, err := h.db.Exec(`
        UPDATE trips 
        SET assigned_courier = $1, assigned_safe = $2, status = 'assigned', updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
    `, req.CourierID, req.SafeID, id)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign trip"})
        return
    }

    // Update safe assignment
    _, err = h.db.Exec("UPDATE safes SET assigned_trip = $1 WHERE id = $2", id, req.SafeID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign safe to trip"})
        return
    }

    // Fetch updated trip
    var trip models.Trip
    err = h.db.QueryRow(`
        SELECT id, client_name, client_email, client_phone, pickup_address, delivery_address,
               assigned_courier, assigned_safe, status, priority, value, instructions, otp_code,
               created_at, updated_at, scheduled_pickup, scheduled_delivery, actual_pickup, actual_delivery
        FROM trips WHERE id = $1
    `, id).Scan(
        &trip.ID, &trip.ClientName, &trip.ClientEmail, &trip.ClientPhone,
        &trip.PickupAddress, &trip.DeliveryAddress, &trip.AssignedCourier,
        &trip.AssignedSafe, &trip.Status, &trip.Priority, &trip.Value,
        &trip.Instructions, &trip.OTPCode, &trip.CreatedAt, &trip.UpdatedAt,
        &trip.ScheduledPickup, &trip.ScheduledDelivery, &trip.ActualPickup, &trip.ActualDelivery,
    )
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated trip"})
        return
    }

    // Log the action
    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")
    h.audit.LogAction(
        userID.(string), userRole.(string), "assign", "trip", &trip.ID,
        c.ClientIP(), map[string]interface{}{
            "courier_id": req.CourierID,
            "safe_id": req.SafeID,
        },
    )

    // Broadcast trip update
    h.realtime.BroadcastTripUpdate(trip.ID, trip)

    c.JSON(http.StatusOK, trip)
}

func (h *TripsHandler) DeleteTrip(c *gin.Context) {
    id := c.Param("id")

    // Check if trip exists and get its safe
    var assignedSafe *string
    err := h.db.QueryRow("SELECT assigned_safe FROM trips WHERE id = $1", id).Scan(&assignedSafe)
    if err == sql.ErrNoRows {
        c.JSON(http.StatusNotFound, gin.H{"error": "Trip not found"})
        return
    } else if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }

    // Free up the assigned safe
    if assignedSafe != nil {
        _, err = h.db.Exec("UPDATE safes SET assigned_trip = NULL WHERE id = $1", *assignedSafe)
        if err != nil {
            // Log error but continue with deletion
            fmt.Printf("Failed to free up safe %s: %v\n", *assignedSafe, err)
        }
    }

    // Mark trip as cancelled instead of deleting
    _, err = h.db.Exec(`
        UPDATE trips 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
    `, id)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel trip"})
        return
    }

    // Log the action
    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")
    h.audit.LogAction(
        userID.(string), userRole.(string), "cancel", "trip", &id,
        c.ClientIP(), nil,
    )

    // Broadcast trip cancellation
    h.realtime.BroadcastSystemNotification("Trip Cancelled", "Trip "+id+" has been cancelled", "warning")

    c.JSON(http.StatusOK, gin.H{"message": "Trip cancelled successfully"})
}