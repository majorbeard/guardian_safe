package database

import (
    "database/sql"
    "fmt"

    _ "github.com/lib/pq"
)

func Connect(databaseURL string) (*sql.DB, error) {
    db, err := sql.Open("postgres", databaseURL)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }

    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    // Configure connection pool
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(5)

    return db, nil
}

func RunMigrations(db *sql.DB) error {
    migrations := []string{
        createUsersTable,
        createSafesTable,
        createTripsTable,
        createAuditLogsTable,
        createAlertsTable,
        createIndexes,
        insertDefaultUsers,
    }

    for i, migration := range migrations {
        if _, err := db.Exec(migration); err != nil {
            return fmt.Errorf("migration %d failed: %w", i+1, err)
        }
    }

    return nil
}

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'courier', 'auditor')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`

const createSafesTable = `
CREATE TABLE IF NOT EXISTS safes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'maintenance', 'error', 'offline')),
    battery_level INTEGER DEFAULT 100 CHECK (battery_level >= 0 AND battery_level <= 100),
    is_locked BOOLEAN DEFAULT true,
    is_tampered BOOLEAN DEFAULT false,
    location_lat DECIMAL(10, 8) DEFAULT -33.9249,
    location_lng DECIMAL(11, 8) DEFAULT 18.4241,
    location_last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_trip UUID,
    last_maintenance TIMESTAMP,
    firmware_version VARCHAR(50) DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`

const createTripsTable = `
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    assigned_courier VARCHAR(255) NOT NULL,
    assigned_safe UUID NOT NULL REFERENCES safes(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled', 'failed')),
    priority VARCHAR(50) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    value DECIMAL(10, 2),
    instructions TEXT,
    otp_code VARCHAR(6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_pickup TIMESTAMP NOT NULL,
    scheduled_delivery TIMESTAMP NOT NULL,
    actual_pickup TIMESTAMP,
    actual_delivery TIMESTAMP
);`

const createAuditLogsTable = `
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    resource_id UUID,
    ip_address INET,
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`

const createAlertsTable = `
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('tamper', 'battery_low', 'offline', 'emergency')),
    safe_id UUID NOT NULL REFERENCES safes(id),
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    acknowledged BOOLEAN DEFAULT false,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`

const createIndexes = `
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_safes_serial ON safes(serial_number);
CREATE INDEX IF NOT EXISTS idx_safes_status ON safes(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_courier ON trips(assigned_courier);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_safe ON alerts(safe_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);`

const insertDefaultUsers = `
INSERT INTO users (username, password, role, is_active) VALUES 
    ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', true),
    ('courier1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'courier', true),
    ('auditor1', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'auditor', true)
ON CONFLICT (username) DO NOTHING;`

// Default password for all users is "password" - change this in production!
