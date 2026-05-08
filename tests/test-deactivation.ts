import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function testDeactivation() {
    try {
        // Create a test user with a small data limit (1 MB)
        const testUsername = "testuser_" + Date.now();
        const testPassword = await bcrypt.hash("testpass", 10);
        const dataLimit = 1024 * 1024; // 1 MB in bytes

        const user = await prisma.proxyUser.create({
            data: {
                username: testUsername,
                password: testPassword,
                isActive: true,
                dataLimit: dataLimit,
                dataUsed: 0,
                telegramUserId: null
            }
        });

        // Simulate traffic usage by increasing dataUsed
        const simulatedTraffic = 1.5 * 1024 * 1024; // 1.5 MB

        const updatedUser = await prisma.proxyUser.update({
            where: { id: user.id },
            data: {
                dataUsed: simulatedTraffic
            }
        });

        // Check if user should be deactivated
        const shouldDeactivate =
            updatedUser.dataLimit !== null &&
            updatedUser.dataUsed >= updatedUser.dataLimit &&
            updatedUser.isActive === true;

        if (shouldDeactivate) {
            // Deactivate the user
            await prisma.proxyUser.update({
                where: { id: user.id },
                data: {
                    isActive: false,
                    deactivatedAt: new Date()
                }
            });
        }

        // Verify
        await prisma.proxyUser.findUnique({
            where: { id: user.id }
        });

        // Cleanup
        await prisma.proxyUser.delete({
            where: { id: user.id }
        });
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testDeactivation();
