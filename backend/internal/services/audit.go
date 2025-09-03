package services

import (
    "database/sql"
    "encoding/json"
    "net"
    "time"

    "github.com/google/uuid"
    "guardian-safe-backend/internal/models"
)

type AuditService struct {
    db *sql.DB
}

func NewAuditService(db *sql.DB) *AuditService {
    return &AuditService{db: db}
}

func (s *AuditService) LogAction(userID, userRole, action, resource string, resourceID *string, ipAddress net.IP, details interface{}) error {
    detailsJSON, _ := json.Marshal(details)
    
    _, err := s.db.Exec(`
        INSERT INTO audit_logs (user_id, user_role, action, resource, resource_id, ip_address, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        userID, userRole, action, resource, resourceID, ipAddress, detailsJSON,
    )
    
    return err
}

func (s *AuditService) GetAuditLogs(page, limit int, filters map[string]interface{}) ([]models.AuditLog, int, error) {
    // Build query with filters
    query := `
        SELECT id, user_id, user_role, action, resource, resource_id, ip_address, details, timestamp
        FROM audit_logs WHERE 1=1`
    
    args := []interface{}{}
    argCount := 0
    
    if userID, ok := filters["userId"].(string); ok && userID != "" {
        argCount++
        query += fmt.Sprintf(" AND user_id = $%d", argCount)
        args = append(args, userID)
    }
    
    if action, ok := filters["action"].(string); ok && action != "" {
        argCount++
        query += fmt.Sprintf(" AND action = $%d", argCount)
        args = append(args, action)
    }
    
    if startDate, ok := filters["startDate"].(time.Time); ok {
        argCount++
        query += fmt.Sprintf(" AND timestamp >= $%d", argCount)
        args = append(args, startDate)
    }
    
    if endDate, ok := filters["endDate"].(time.Time); ok {
        argCount++
        query += fmt.Sprintf(" AND timestamp <= $%d", argCount)
        args = append(args, endDate)
    }
    
    // Get total count
    countQuery := "SELECT COUNT(*) FROM (" + query + ") AS filtered"
    var total int
    err := s.db.QueryRow(countQuery, args...).Scan(&total)
    if err != nil {
        return nil, 0, err
    }
    
    // Add pagination
    query += " ORDER BY timestamp DESC"
    argCount++
    query += fmt.Sprintf(" LIMIT $%d", argCount)
    args = append(args, limit)
    
    argCount++
    query += fmt.Sprintf(" OFFSET $%d", argCount)
    args = append(args, (page-1)*limit)
    
    rows, err := s.db.Query(query, args...)
    if err != nil {
        return nil, 0, err
    }
    defer rows.Close()
    
    var logs []models.AuditLog
    for rows.Next() {
        var log models.AuditLog
        var detailsJSON []byte
        
        err := rows.Scan(
            &log.ID, &log.UserID, &log.UserRole, &log.Action, &log.Resource,
            &log.ResourceID, &log.IPAddress, &detailsJSON, &log.Timestamp,
        )
        if err != nil {
            return nil, 0, err
        }
        
        if len(detailsJSON) > 0 {
            json.Unmarshal(detailsJSON, &log.Details)
        }
        
        logs = append(logs, log)
    }
    
    return logs, total, nil
}