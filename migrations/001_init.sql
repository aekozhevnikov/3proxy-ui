-- 3proxy-ui initial schema
-- Compatible with SQLite (GORM AutoMigrate)

-- User table (admin panel users)
CREATE TABLE IF NOT EXISTS "User" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    isAdmin BOOLEAN NOT NULL DEFAULT 0,
    sessionVersion INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME
);

-- Server table (3proxy servers)
CREATE TABLE IF NOT EXISTS "Server" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hostnameOrIp TEXT NOT NULL,
    portForNewAccessKeys INTEGER NOT NULL DEFAULT 3128,
    apiUrl TEXT,
    apiId TEXT,
    apiCertSha256 TEXT,
    apiCreatedAt DATETIME,
    isAvailable BOOLEAN NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME
);

-- ProxyUser table (3proxy proxy users)
CREATE TABLE IF NOT EXISTS "ProxyUser" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT 1,
    dataLimit BIGINT,
    dataUsed BIGINT NOT NULL DEFAULT 0,
    ipLimit INTEGER,
    telegramUserId TEXT,
    deactivatedAt DATETIME,
    expiresAt DATETIME,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME
);

CREATE INDEX IF NOT EXISTS idx_proxy_user_is_active ON "ProxyUser" (isActive);
CREATE INDEX IF NOT EXISTS idx_proxy_user_expires_at ON "ProxyUser" (expiresAt);
CREATE INDEX IF NOT EXISTS idx_proxy_user_deactivated_at ON "ProxyUser" (deactivatedAt);

-- ConfigVersion table
CREATE TABLE IF NOT EXISTS "ConfigVersion" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER NOT NULL DEFAULT 1,
    config TEXT,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user if not exists
INSERT OR IGNORE INTO "User" (username, password, isAdmin, sessionVersion)
VALUES ('admin', 'admin', 1, 0);
