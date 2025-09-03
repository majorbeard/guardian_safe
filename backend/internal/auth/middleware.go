package auth

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/sessions"
    "github.com/gin-contrib/sessions/cookie"
)

func SessionMiddleware() gin.HandlerFunc {
    store := cookie.NewStore([]byte("your-super-secret-session-key-change-this"))
    store.Options(sessions.Options{
        Path:     "/",
        Domain:   "",
        MaxAge:   86400 * 7, // 7 days
        Secure:   false,     // Set to true in production with HTTPS
        HttpOnly: true,
        SameSite: http.SameSiteLaxMode,
    })
    return sessions.Sessions("guardian-session", store)
}

func RequireAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        session := sessions.Default(c)
        userID := session.Get("user_id")
        userRole := session.Get("user_role")

        if userID == nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
            c.Abort()
            return
        }

        // Set user context
        c.Set("user_id", userID)
        c.Set("user_role", userRole)
        c.Next()
    }
}

func RequireRole(allowedRoles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole, exists := c.Get("user_role")
        if !exists {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
            c.Abort()
            return
        }

        role := userRole.(string)
        for _, allowedRole := range allowedRoles {
            if role == allowedRole {
                c.Next()
                return
            }
        }

        c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
        c.Abort()
    }
}