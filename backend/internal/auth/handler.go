package auth

import (
    "database/sql"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/sessions"
    "golang.org/x/crypto/bcrypt"
    "github.com/google/uuid"

    "guardian-safe-backend/internal/models"
    "guardian-safe-backend/internal/services"
)

type Handler struct {
    db       *sql.DB
    security *services.SecurityService
}

func NewHandler(db *sql.DB, security *services.SecurityService) *Handler {
    return &Handler{
        db:       db,
        security: security,
    }
}

func (h *Handler) Login(c *gin.Context) {
    var req models.LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
        return
    }

    // Get user from database
    user, err := h.getUserByUsername(req.Username)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
        return
    }

    // Check if user is active
    if !user.IsActive {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Account is deactivated"})
        return
    }

    // Verify password
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
        return
    }

    // Update last login
    if err := h.updateLastLogin(user.ID); err != nil {
        // Log error but don't fail login
        println("Failed to update last login:", err.Error())
    }

    // Create session
    session := sessions.Default(c)
    session.Set("user_id", user.ID)
    session.Set("user_role", user.Role)
    session.Save()

    // Return user data (without password)
    c.JSON(http.StatusOK, user)
}

func (h *Handler) Logout(c *gin.Context) {
    session := sessions.Default(c)
    session.Clear()
    session.Save()

    c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *Handler) GetCurrentUser(c *gin.Context) {
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
        return
    }

    user, err := h.getUserByID(userID.(string))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    c.JSON(http.StatusOK, user)
}

func (h *Handler) ChangePassword(c *gin.Context) {
    var req models.ChangePasswordRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
        return
    }

    userID, _ := c.Get("user_id")
    user, err := h.getUserByID(userID.(string))
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    // Verify current password
    if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Current password is incorrect"})
        return
    }

    // Validate new password
    if len(req.NewPassword) < 8 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "New password must be at least 8 characters"})
        return
    }

    // Hash new password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
        return
    }

    // Update password in database
    _, err = h.db.Exec("UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", 
        string(hashedPassword), userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

func (h *Handler) getUserByUsername(username string) (*models.User, error) {
    user := &models.User{}
    err := h.db.QueryRow(`
        SELECT id, username, password, role, is_active, created_at, last_login 
        FROM users 
        WHERE username = $1`,
        username,
    ).Scan(&user.ID, &user.Username, &user.Password, &user.Role, &user.IsActive, &user.CreatedAt, &user.LastLogin)
    
    if err != nil {
        return nil, err
    }
    
    return user, nil
}

func (h *Handler) getUserByID(id string) (*models.User, error) {
    user := &models.User{}
    err := h.db.QueryRow(`
        SELECT id, username, password, role, is_active, created_at, last_login 
        FROM users 
        WHERE id = $1`,
        id,
    ).Scan(&user.ID, &user.Username, &user.Password, &user.Role, &user.IsActive, &user.CreatedAt, &user.LastLogin)
    
    if err != nil {
        return nil, err
    }
    
    return user, nil
}

func (h *Handler) updateLastLogin(userID string) error {
    _, err := h.db.Exec("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", userID)
    return err
}