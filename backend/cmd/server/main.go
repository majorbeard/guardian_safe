package main

import (
    "log"
    "os"
    
    "github.com/gin-gonic/gin"
    "github.com/joho/godotenv"
    
    "guardian-safe-backend/internal/config"
    "guardian-safe-backend/internal/database"
    "guardian-safe-backend/internal/handlers"
    "guardian-safe-backend/internal/auth"
    "guardian-safe-backend/internal/websocket"
    "guardian-safe-backend/internal/services"
)

func main() {
    // Load environment variables
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found, using system environment variables")
    }

    // Initialize configuration
    cfg := config.Load()

    // Initialize database
    db, err := database.Connect(cfg.DatabaseURL)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer db.Close()

    // Run migrations
    if err := database.RunMigrations(db); err != nil {
        log.Fatal("Failed to run migrations:", err)
    }

    // Initialize services
    auditService := services.NewAuditService(db)
    realtimeService := services.NewRealtimeService()
    securityService := services.NewSecurityService()

    // Initialize WebSocket hub
    hub := websocket.NewHub()
    go hub.Run()

    // Initialize Gin router
    if cfg.Environment == "production" {
        gin.SetMode(gin.ReleaseMode)
    }
    
    router := gin.New()
    router.Use(gin.Logger())
    router.Use(gin.Recovery())

    // Configure CORS for your frontend
    router.Use(func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")
        if origin == "http://localhost:5173" || origin == "http://localhost:3000" {
            c.Header("Access-Control-Allow-Origin", origin)
        }
        c.Header("Access-Control-Allow-Credentials", "true")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
        c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    })

    // Initialize handlers
    authHandler := auth.NewHandler(db, securityService)
    adminHandler := handlers.NewAdminHandler(db, auditService)
    safesHandler := handlers.NewSafesHandler(db, realtimeService, auditService)
    tripsHandler := handlers.NewTripsHandler(db, realtimeService, auditService)
    auditHandler := handlers.NewAuditHandler(db)

    // Session middleware
    router.Use(auth.SessionMiddleware())

    // Health check endpoint
    router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "healthy", "service": "guardian-safe-api"})
    })

    // WebSocket endpoint
    router.GET("/ws", func(c *gin.Context) {
        websocket.HandleWebSocket(hub, c.Writer, c.Request)
    })

    // Authentication routes
    authRoutes := router.Group("/api/auth")
    {
        authRoutes.POST("/login", authHandler.Login)
        authRoutes.POST("/logout", authHandler.Logout)
        authRoutes.GET("/me", auth.RequireAuth(), authHandler.GetCurrentUser)
        authRoutes.PUT("/change-password", auth.RequireAuth(), authHandler.ChangePassword)
    }

    // Admin routes (require admin role)
    adminRoutes := router.Group("/api/admin")
    adminRoutes.Use(auth.RequireAuth(), auth.RequireRole("admin"))
    {
        adminRoutes.GET("/users", adminHandler.GetUsers)
        adminRoutes.POST("/users", adminHandler.CreateUser)
        adminRoutes.PUT("/users/:id", adminHandler.UpdateUser)
        adminRoutes.DELETE("/users/:id", adminHandler.DeleteUser)
    }

    // Safe management routes
    safeRoutes := router.Group("/api/safes")
    safeRoutes.Use(auth.RequireAuth())
    {
        safeRoutes.GET("", safesHandler.GetSafes)
        safeRoutes.GET("/:id", safesHandler.GetSafe)
        safeRoutes.POST("/register", auth.RequireRole("admin"), safesHandler.RegisterSafe)
        safeRoutes.PUT("/:id", auth.RequireRole("admin"), safesHandler.UpdateSafe)
        safeRoutes.POST("/:id/unlock", safesHandler.UnlockSafe)
        safeRoutes.POST("/:id/lock", safesHandler.LockSafe)
    }

    // Trip management routes
    tripRoutes := router.Group("/api/trips")
    tripRoutes.Use(auth.RequireAuth())
    {
        tripRoutes.GET("", tripsHandler.GetTrips)
        tripRoutes.POST("", auth.RequireRole("admin"), tripsHandler.CreateTrip)
        tripRoutes.PUT("/:id", tripsHandler.UpdateTrip)
        tripRoutes.PUT("/:id/assign", auth.RequireRole("admin"), tripsHandler.AssignTrip)
        tripRoutes.DELETE("/:id", auth.RequireRole("admin"), tripsHandler.DeleteTrip)
    }

    // Audit routes
    auditRoutes := router.Group("/api/audit")
    auditRoutes.Use(auth.RequireAuth(), auth.RequireRole("admin", "auditor"))
    {
        auditRoutes.GET("/logs", auditHandler.GetAuditLogs)
    }

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Server starting on port %s", port)
    log.Fatal(router.Run(":" + port))
}