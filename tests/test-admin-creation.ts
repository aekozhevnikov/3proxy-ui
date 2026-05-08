import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testAdminCreation() {
    try {
        console.debug("Testing admin auto-creation...");

        // Clear existing admin users for clean test
        await prisma.user.deleteMany({
            where: { isAdmin: true }
        });
        console.debug("Cleared existing admin users");

        // Import and call ensureAdminUser
        const { ensureAdminUser } = await import("../src/core/actions/admin.js");

        const result = await ensureAdminUser({
            username: "testadmin",
            password: "testpass123",
            name: "Test Admin"
        });

        console.debug("ensureAdminUser result:", result);

        // Verify admin was created
        const admin = await prisma.user.findFirst({
            where: { isAdmin: true }
        });

        if (!admin) {
            throw new Error("Admin user was not created");
        }

        console.debug("✅ Admin user created:", {
            id: admin.id,
            username: admin.username,
            name: admin.name,
            isAdmin: admin.isAdmin
        });

        // Test second call - should not create another admin
        const result2 = await ensureAdminUser();
        console.debug("Second call result (should be null):", result2);

        const adminCount = await prisma.user.count({
            where: { isAdmin: true }
        });

        if (adminCount !== 1) {
            throw new Error(`Expected 1 admin, found ${adminCount}`);
        }

        console.debug("✅ Idempotency test PASSED - only one admin exists");

        // Cleanup
        await prisma.user.delete({
            where: { id: admin.id }
        });

        console.debug("Test admin deleted");
        console.debug("✅ All admin creation tests PASSED");
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testAdminCreation();
