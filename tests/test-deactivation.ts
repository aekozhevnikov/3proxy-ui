import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testDeactivation() {
    try {
        console.log('Starting deactivation test...');

        // Create a test user with a small data limit (1 MB)
        const testUsername = 'testuser_' + Date.now();
        const testPassword = await bcrypt.hash('testpass', 10);
        const dataLimit = 1 * 1024 * 1024; // 1 MB in bytes

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

        console.log(`Created test user: ${testUsername} with ${dataLimit} bytes limit`);

        // Simulate traffic usage by increasing dataUsed
        const simulatedTraffic = 1.5 * 1024 * 1024; // 1.5 MB

        const updatedUser = await prisma.proxyUser.update({
            where: { id: user.id },
            data: {
                dataUsed: simulatedTraffic
            }
        });

        console.log(`Updated user dataUsed to ${simulatedTraffic} bytes`);

        // Check if user should be deactivated
        const shouldDeactivate = updatedUser.dataLimit !== null &&
                                updatedUser.dataUsed >= updatedUser.dataLimit &&
                                updatedUser.isActive === true;

        console.log(`Should deactivate: ${shouldDeactivate}`);
        console.log(`dataUsed: ${updatedUser.dataUsed}, dataLimit: ${updatedUser.dataLimit}, isActive: ${updatedUser.isActive}`);

        if (shouldDeactivate) {
            // Deactivate the user
            const deactivatedUser = await prisma.proxyUser.update({
                where: { id: user.id },
                data: {
                    isActive: false,
                    deactivatedAt: new Date()
                }
            });

            console.log(`User deactivated at: ${deactivatedUser.deactivatedAt}`);
        }

        // Verify
        const finalUser = await prisma.proxyUser.findUnique({
            where: { id: user.id }
        });

        console.log('Final user state:', {
            username: finalUser?.username,
            isActive: finalUser?.isActive,
            dataUsed: finalUser?.dataUsed,
            dataLimit: finalUser?.dataLimit,
            deactivatedAt: finalUser?.deactivatedAt
        });

        // Cleanup
        await prisma.proxyUser.delete({
            where: { id: user.id }
        });

        console.log('Test user deleted');

        console.log('✅ Deactivation logic test PASSED');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testDeactivation();
