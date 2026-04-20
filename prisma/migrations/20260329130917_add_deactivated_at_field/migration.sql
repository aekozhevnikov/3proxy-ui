-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Server" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "hostnameOrIp" TEXT NOT NULL,
    "portForNewAccessKeys" INTEGER NOT NULL DEFAULT 3128,
    "apiUrl" TEXT,
    "apiId" TEXT,
    "apiCertSha256" TEXT,
    "apiCreatedAt" DATETIME,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ProxyUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dataLimit" BIGINT,
    "data_used" BIGINT NOT NULL DEFAULT 0,
    "ipLimit" INTEGER DEFAULT 1,
    "telegramUserId" TEXT,
    "deactivated_at" DATETIME,
    "expires_at" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ConfigVersion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "ProxyUser_username_key" ON "ProxyUser"("username");

-- CreateIndex
CREATE INDEX "ProxyUser_isActive_idx" ON "ProxyUser"("isActive");

-- CreateIndex
CREATE INDEX "ProxyUser_expires_at_idx" ON "ProxyUser"("expires_at");

-- CreateIndex
CREATE INDEX "ProxyUser_deactivated_at_idx" ON "ProxyUser"("deactivated_at");
