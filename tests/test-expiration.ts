import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function testExpirationDeactivation() {
    try {
        console.log('=== Test: Expiration Deactivation ===\n');

        // 1. Create test ProxyUser with past expiration date
        const testUsername = 'expiration_test_' + Date.now();
        const testPassword = await bcrypt.hash('testpass', 10);
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

        console.log(`✅ Created ProxyUser with expired date: ${testUsername}`);
        console.log(`   Expires at: ${pastDate.toISOString()}\n`);

        // 2. Call maintenance API (no logs needed)
        console.log('Calling maintenance API for expiration check...');
        const response = await fetch('http://localhost:3000/api/users/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // Empty body, no logsDir
        });

        const data = await response.json();
        console.log('Maintenance response:', data);

        if (!response.ok || !data.success) {
            throw new Error('Maintenance API failed: ' + (data.error || 'Unknown error'));
        }

        console.log(`✅ Maintenance completed: ${data.deactivatedCount} user(s) deactivated\n`);

        // 3. Verify user is deactivated
        const finalUser = await prisma.proxyUser.findUnique({
            where: { id: proxyUser.id }
        });

        console.log('=== Final User State ===');
        console.log(`Username: ${finalUser?.username}`);
        console.log(`isActive: ${finalUser?.isActive}`);
        console.log(`expiresAt: ${finalUser?.expiresAt?.toISOString()}`);
        console.log(`deactivatedAt: ${finalUser?.deactivatedAt?.toISOString() || 'null'}`);

        // 4. Assertions
        if (finalUser?.isActive !== false) {
            throw new Error('User should be deactivated due to expiration');
        }
        if (finalUser?.deactivatedAt === null) {
            throw new Error('deactivatedAt should be set');
        }
        // deactivatedAt should be close to now (within last few seconds)
        const deactivatedTime = finalUser.deactivatedAt.getTime();
        const now = Date.now();
        if (deactivatedTime > now + 60000) { // Not in future
            throw new Error('deactivatedAt should not be in the future');
        }
        if (now - deactivatedTime > 60000) { // Not too old
            throw new Error('deactivatedAt should be recent (within last minute)');
        }

        console.log('\n✅ All assertions PASSED');

        // 5. Cleanup
        await prisma.proxyUser.delete({
            where: { id: proxyUser.id }
        });

        console.log('✅ Cleanup completed');
        console.log('\n🎉 Expiration deactivation test PASSED!');

    } catch (error) {
        console.error('\n❌ Test FAILED:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testExpirationDeactivation();
