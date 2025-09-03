package handlers

import (
    "net/http"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "guardian-safe-backend/internal/services"
)

type AuditHandler struct {
    audit *services.AuditService
}

func NewAuditHandler(db *sql.DB) *AuditHandler {
    return &AuditHandler{
        audit: services.NewAuditService(db),
    }
}

func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
    // Parse pagination parameters
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
    if page < 1 {
        page = 1
    }
    if limit < 1 || limit > 100 {
        limit = 50
    }

    // Parse filters
    filters := make(map[string]interface{})
    
    if userId := c.Query("userId"); userId != "" {
        filters["userId"] = userId
    }
    
    if action := c.Query("action"); action != "" {
        filters["action"] = action
    }
    
    if startDate := c.Query("startDate"); startDate != "" {
        if t, err := time.Parse(time.RFC3339, startDate); err == nil {
            filters["startDate"] = t
        }
    }
    
    if endDate := c.Query("endDate"); endDate != "" {
        if t, err := time.Parse(time.RFC3339, endDate); err == nil {
            filters["endDate"] = t
        }
    }

    logs, total, err := h.audit.GetAuditLogs(page, limit, filters)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs"})
        return
    }

    hasMore := (page * limit) < total

    response := models.PaginatedResponse{
        Data:    logs,
        Total:   total,
        Page:    page,
        Limit:   limit,
        HasMore: hasMore,
    }

    c.JSON(http.StatusOK, response)
}