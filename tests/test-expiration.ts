import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function testExpirationDeactivation() {
    try {
        // 1. Create test ProxyUser with past expiration date
        const testUsername = "expiration_test_" + Date.now();
        const testPassword = await bcrypt.hash("testpass", 10);
        const dataLimitBytes = 10 * 1024 * 1024; // 10 MB

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1); // Yesterday

        const proxyUser = await prisma.proxyUser.create({
            data: {
                username: testUsername,
                password: testPassword,
                isActive: true,
                dataLimit: dataLimitBytes,
                dataUsed: 0,
                expiresAt: pastDate, // Expired!
                telegramUserId: null
            }
        });

        // 2. Call maintenance API (no logs needed)
        const response = await fetch("http://localhost:3000/api/users/maintenance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}) // Empty body, no logsDir
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error("Maintenance API failed: " + (data.error || "Unknown error"));
        }

        // 3. Verify user is deactivated
        const finalUser = await prisma.proxyUser.findUnique({
            where: { id: proxyUser.id }
        });

        // 4. Assertions
        if (finalUser?.isActive !== false) {
            throw new Error("User should be deactivated due to expiration");
        }
        if (finalUser?.deactivatedAt === null) {
            throw new Error("deactivatedAt should be set");
        }
        // deactivatedAt should be close to now (within last few seconds)
        const deactivatedTime = finalUser.deactivatedAt.getTime();
        const now = Date.now();
        if (deactivatedTime > now + 60000) {
            // Not in future
            throw new Error("deactivatedAt should not be in the future");
        }
        if (now - deactivatedTime > 60000) {
            // Not too old
            throw new Error("deactivatedAt should be recent (within last minute)");
        }

        // 5. Cleanup
        await prisma.proxyUser.delete({
            where: { id: proxyUser.id }
        });
    } catch (error) {
        console.error("\n❌ Test FAILED:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testExpirationDeactivation();
