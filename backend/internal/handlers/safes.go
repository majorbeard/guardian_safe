package handlers

import (
    "database/sql"
    "net/http"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"

    "guardian-safe-backend/internal/models"
    "guardian-safe-backend/internal/services"
)

type SafesHandler struct {
    db       *sql.DB
    realtime *services.RealtimeService
    audit    *services.AuditService
}

func NewSafesHandler(db *sql.DB, realtime *services.RealtimeService, audit *services.AuditService) *SafesHandler {
    return &SafesHandler{
        db:       db,
        realtime: realtime,
        audit:    audit,
    }
}

func (h *SafesHandler) GetSafes(c *gin.Context) {
    rows, err := h.db.Query(`
        SELECT id, serial_number, status, battery_level, is_locked, is_tampered,
               location_lat, location_lng, location_last_update, assigned_trip,
               last_maintenance, firmware_version, created_at, updated_at
        FROM safes
        ORDER BY created_at DESC
    `)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch safes"})
        return
    }
    defer rows.Close()

    var safes []models.SafeResponse
    for rows.Next() {
        var safe models.Safe
        err := rows.Scan(
            &safe.ID, &safe.SerialNumber, &safe.Status, &safe.BatteryLevel,
            &safe.IsLocked, &safe.IsTampered, &safe.LocationLat, &safe.LocationLng,
            &safe.LocationLastUpdate, &safe.AssignedTrip, &safe.LastMaintenance,
            &safe.FirmwareVersion, &safe.CreatedAt, &safe.UpdatedAt,
        )
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse safe data"})
            return
        }

        safes = append(safes, safe.ToResponse())
    }

    c.JSON(http.StatusOK, safes)
}

func (h *SafesHandler) GetSafe(c *gin.Context) {
    id := c.Param("id")
    
    var safe models.Safe
    err := h.db.QueryRow(`
        SELECT id, serial_number, status, battery_level, is_locked, is_tampered,
               location_lat, location_lng, location_last_update, assigned_trip,
               last_maintenance, firmware_version, created_at, updated_at
        FROM safes WHERE id = $1
    `, id).Scan(
        &safe.ID, &safe.SerialNumber, &safe.Status, &safe.BatteryLevel,
        &safe.IsLocked, &safe.IsTampered, &safe.LocationLat, &safe.LocationLng,
        &safe.LocationLastUpdate, &safe.AssignedTrip, &safe.LastMaintenance,
        &safe.FirmwareVersion, &safe.CreatedAt, &safe.UpdatedAt,
    )
    
    if err == sql.ErrNoRows {
        c.JSON(http.StatusNotFound, gin.H{"error": "Safe not found"})
        return
    } else if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch safe"})
        return
    }

    c.JSON(http.StatusOK, safe.ToResponse())
}

func (h *SafesHandler) RegisterSafe(c *gin.Context) {
    var req models.RegisterSafeRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
        return
    }

    // Check if safe already exists
    var exists bool
    err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM safes WHERE serial_number = $1)", req.SerialNumber).Scan(&exists)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }
    
    if exists {
        c.JSON(http.StatusConflict, gin.H{"error": "Safe with this serial number already exists"})
        return
    }

    // Create new safe
    id := uuid.New().String()
    _, err = h.db.Exec(`
        INSERT INTO safes (id, serial_number, status, firmware_version)
        VALUES ($1, $2, 'inactive', '1.0.0')
    `, id, req.SerialNumber)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register safe"})
        return
    }

    // Fetch the created safe
    var safe models.Safe
    err = h.db.QueryRow(`
        SELECT id, serial_number, status, battery_level, is_locked, is_tampered,
               location_lat, location_lng, location_last_update, assigned_trip,
               last_maintenance, firmware_version, created_at, updated_at
        FROM safes WHERE id = $1
    `, id).Scan(
        &safe.ID, &safe.SerialNumber, &safe.Status, &safe.BatteryLevel,
        &safe.IsLocked, &safe.IsTampered, &safe.LocationLat, &safe.LocationLng,
        &safe.LocationLastUpdate, &safe.AssignedTrip, &safe.LastMaintenance,
        &safe.FirmwareVersion, &safe.CreatedAt, &safe.UpdatedAt,
    )
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch created safe"})
        return
    }

    // Log the action
    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")
    h.audit.LogAction(
        userID.(string), userRole.(string), "create", "safe", &safe.ID,
        c.ClientIP(), map[string]interface{}{"serial_number": req.SerialNumber},
    )

    // Broadcast the new safe to connected clients
    h.realtime.BroadcastSystemNotification("Safe Registered", "New safe "+req.SerialNumber+" has been registered", "info")

    c.JSON(http.StatusCreated, safe.ToResponse())
}

func (h *SafesHandler) UpdateSafe(c *gin.Context) {
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
        "status": true, "battery_level": true, "is_locked": true, "is_tampered": true,
        "location_lat": true, "location_lng": true, "assigned_trip": true,
        "last_maintenance": true, "firmware_version": true,
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

    query := "UPDATE safes SET " + strings.Join(setParts, ", ") + " WHERE id = $" + strconv.Itoa(argCount)
    
    _, err := h.db.Exec(query, args...)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update safe"})
        return
    }

    // Fetch updated safe
    var safe models.Safe
    err = h.db.QueryRow(`
        SELECT id, serial_number, status, battery_level, is_locked, is_tampered,
               location_lat, location_lng, location_last_update, assigned_trip,
               last_maintenance, firmware_version, created_at, updated_at
        FROM safes WHERE id = $1
    `, id).Scan(
        &safe.ID, &safe.SerialNumber, &safe.Status, &safe.BatteryLevel,
        &safe.IsLocked, &safe.IsTampered, &safe.LocationLat, &safe.LocationLng,
        &safe.LocationLastUpdate, &safe.AssignedTrip, &safe.LastMaintenance,
        &safe.FirmwareVersion, &safe.CreatedAt, &safe.UpdatedAt,
    )
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated safe"})
        return
    }

    // Log the action
    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")
    h.audit.LogAction(
        userID.(string), userRole.(string), "update", "safe", &safe.ID,
        c.ClientIP(), updates,
    )

    // Broadcast safe update
    safeUpdate := map[string]interface{}{
        "safeId":       safe.ID,
        "status":       safe.Status,
        "batteryLevel": safe.BatteryLevel,
        "isLocked":     safe.IsLocked,
        "isTampered":   safe.IsTampered,
        "location": map[string]interface{}{
            "lat": safe.LocationLat,
            "lng": safe.LocationLng,
        },
    }
    h.realtime.BroadcastSafeUpdate(safe.ID, safeUpdate)

    c.JSON(http.StatusOK, safe.ToResponse())
}

func (h *SafesHandler) UnlockSafe(c *gin.Context) {
    id := c.Param("id")
    
    var req models.UnlockSafeRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
        return
    }

    // In a real implementation, you would:
    // 1. Validate the OTP against the stored/generated OTP for this safe
    // 2. Check if the OTP is still valid (not expired)
    // 3. Send the unlock command to the physical safe via Raspberry Pi
    // 4. Wait for confirmation from the hardware

    // For now, we'll simulate the unlock process
    _, err := h.db.Exec(`
        UPDATE safes 
        SET is_locked = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND status = 'active'
    `, id)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unlock safe"})
        return
    }

    // Log the action
    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")
    h.audit.LogAction(
        userID.(string), userRole.(string), "unlock", "safe", &id,
        c.ClientIP(), map[string]interface{}{"otp_code": req.OTPCode},
    )

    // Broadcast safe update
    safeUpdate := map[string]interface{}{
        "safeId":   id,
        "isLocked": false,
    }
    h.realtime.BroadcastSafeUpdate(id, safeUpdate)

    c.JSON(http.StatusOK, gin.H{"message": "Safe unlocked successfully"})
}

func (h *SafesHandler) LockSafe(c *gin.Context) {
    id := c.Param("id")

    // Update safe to locked state
    _, err := h.db.Exec(`
        UPDATE safes 
        SET is_locked = true, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND status = 'active'
    `, id)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to lock safe"})
        return
    }

    // Log the action
    userID, _ := c.Get("user_id")
    userRole, _ := c.Get("user_role")
    h.audit.LogAction(
        userID.(string), userRole.(string), "lock", "safe", &id,
        c.ClientIP(), nil,
    )

    // Broadcast safe update
    safeUpdate := map[string]interface{}{
        "safeId":   id,
        "isLocked": true,
    }
    h.realtime.BroadcastSafeUpdate(id, safeUpdate)

    c.JSON(http.StatusOK, gin.H{"message": "Safe locked successfully"})
}