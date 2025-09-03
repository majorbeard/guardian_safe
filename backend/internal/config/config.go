package config

import (
    "os"
)

type Config struct {
    Environment   string
    DatabaseURL   string
    SessionSecret string
    Port          string
}

func Load() *Config {
    return &Config{
        Environment:   getEnv("ENVIRONMENT", "development"),
        DatabaseURL:   getEnv("DATABASE_URL", "postgres://localhost/guardian_safe?sslmode=disable"),
        SessionSecret: getEnv("SESSION_SECRET", "your-super-secret-session-key-change-this"),
        Port:          getEnv("PORT", "8080"),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}