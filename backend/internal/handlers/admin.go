package handlers

import (
    "database/sql"
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "golang.org/x/crypto/bcrypt"

    "guardian-safe-backend/internal/models"
    "guardian-safe-backend/internal/services"
)

type AdminHandler struct {
    db    *sql.DB
    audit *services.AuditService
}

func NewAdminHandler(db *sql.DB, audit *services.AuditService) *AdminHandler {
    return &AdminHandler{
        db:    db,
        audit: audit,
    }
}

func (h *AdminHandler) GetUsers(c *gin.Context) {
    rows, err := h.db.Query(`
        SELECT id, username, role, is_active, created_at, last_login
        FROM users
        ORDER BY created_at DESC
    `)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
        return
    }
    defer rows.Close()

    var users []models.User
    for rows.Next() {
        var user models.User
        err := rows.Scan(&user.ID, &user.Username, &user.Role, &user.IsActive, &user.CreatedAt, &user.LastLogin)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user data"})
            return
        }
        users = append(users, user)
    }

    c.JSON(http.StatusOK, users)
}

func (h *AdminHandler) CreateUser(c *gin.Context) {
    var req models.CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
        return
    }

    // Validate role
    if req.Role != "admin" && req.Role != "courier" && req.Role != "auditor" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
        return
    }

    // Check if user already exists
    var exists bool
    err := h.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)", req.Username).Scan(&exists)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
        return
    }
    
    if exists {
        c.JSON(http.StatusConflict, gin.H{"error": "User with this username already exists"})
        return
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
        return
    }

    // Create user
    id := uuid.New().String()
    _, err = h.db.Exec(`
        INSERT INTO users (id, username, password, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
    `, id, req.Username, string(hashedPassword), req.Role, req.IsActive)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
        return
    }

    // Fetch created user
    var user models.User
    err = h.db.QueryRow(`
        SELECT id, username, role, is_active, created_at, last_login
        FROM users WHERE id = $1
    `, id).Scan(&user.ID, &user.Username, &user.Role, &user.IsActive, &user.CreatedAt, &user.LastLogin)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch created user"})
        return
    }

    // Log the action
    adminID, _ := c.Get("user_id")
    adminRole, _ := c.Get("user_role")
    h.audit.LogAction(
        adminID.(string), adminRole.(string), "create", "user", &user.ID,
        c.ClientIP(), map[string]interface{}{
            "username": req.Username,
            "role": req.Role,
        },
    )

    c.JSON(http.StatusCreated, user)
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
    id := c.Param("id")
    
    var updates map[string]interface{}
    if err := c.ShouldBindJSON(&updates); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
        return
    }

    // Build update query
    setParts := []string{}
    args := []interface{}{}
    argCount := 0

    allowedFields := map[string]bool{
        "username": true, "role": true, "is_active": true,
    }

    for field, value := range updates {
        if !allowedFields[field] {
            continue
        }
        
        // Validate role if it's being updated
        if field == "role" {
            role := value.(string)
            if role != "admin" && role != "courier" && role != "auditor" {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
                return
            }
        }
        
        argCount++
        setParts = append(setParts, field+" = $"+strconv.Itoa(argCount))
        args = append(args, value)
    }

    if len(setParts) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No valid fields to update"})
        return
    }

    // Add WHERE clause
    argCount++
    args = append(args, id)

    query := "UPDATE users SET " + strings.Join(setParts, ", ") + " WHERE id = $" + strconv.Itoa(argCount)
    
    _, err := h.db.Exec(query, args...)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
        return
    }

    // Fetch updated user
    var user models.User
    err = h.db.QueryRow(`
        SELECT id, username, role, is_active, created_at, last_login
        FROM users WHERE id = $1
    `, id).Scan(&user.ID, &user.Username, &user.Role, &user.IsActive, &user.CreatedAt, &user.LastLogin)
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated user"})
        return
    }

    // Log the action
    adminID, _ := c.Get("user_id")
    adminRole, _ := c.Get("user_role")
    h.audit.LogAction(
        adminID.(string), adminRole.(string), "update", "user", &user.ID,
        c.ClientIP(), updates,
    )

    c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) DeleteUser(c *gin.Context) {
    id := c.Param("id")

    // Deactivate user instead of deleting
    _, err := h.db.Exec("UPDATE users SET is_active = false WHERE id = $1", id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deactivate user"})
        return
    }

    // Log the action
    adminID, _ := c.Get("user_id")
    adminRole, _ := c.Get("user_role")
    h.audit.LogAction(
        adminID.(string), adminRole.(string), "deactivate", "user", &id,
        c.ClientIP(), nil,
    )

    c.JSON(http.StatusOK, gin.H{"message": "User deactivated successfully"})
}