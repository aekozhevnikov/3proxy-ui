import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function testIntegration() {
    try {

        // 1. Create test ProxyUser with data limit
        const testUsername = 'integration_test_' + Date.now();
        const testPassword = await bcrypt.hash('testpass', 10);
        const dataLimitMB = 10; // 10 MB limit
        const dataLimitBytes = dataLimitMB * 1024 * 1024;

        const proxyUser = await prisma.proxyUser.create({
            data: {
                username: testUsername,
                password: testPassword,
                isActive: true,
                dataLimit: dataLimitBytes,
                dataUsed: 0,
                telegramUserId: null // Set to test Telegram: '123456789'
            }
        });


        // 2. Simulate traffic logs
        const logsDir = path.join(process.cwd(), 'test-logs');
        await fs.mkdir(logsDir, { recursive: true });

        const logContent = JSON.stringify({
            time_unix: 1774790000,
            proxy: { "type:": "HTTP", port: 8080 },
            auth: { user: testUsername },
            client: { ip: "192.168.1.100", port: 12345 },
            server: { ip: "93.158.167.115", port: 443 },
            bytes: { sent: 5242880, received: 5242880 },
            request: { hostname: "test.com" },
            message: "HTTP request completed"
        }) + '\n'; // 10 MB sent + received
        const logFile = path.join(logsDir, '3proxy.log');
        await fs.writeFile(logFile, logContent);


        // 3. Call maintenance API to trigger full flow, passing logsDir
        const maintenanceResponse = await fetch('http://localhost:3000/api/users/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logsDir })
        });
        const maintenanceData = await maintenanceResponse.json();


        if (!maintenanceResponse.ok || !maintenanceData.success) {
            throw new Error('Maintenance API failed: ' + (maintenanceData.error || 'Unknown error'));
        }


        // 5. Verify final state
        const finalUser = await prisma.proxyUser.findUnique({
            where: { id: proxyUser.id }
        });

        // 5b. Verify .proxyauth file content
        const proxyauthContent = await fs.readFile(path.join(process.cwd(), '3proxy', 'users', '.proxyauth'), 'utf-8');
        const lines = proxyauthContent.split('\n').filter(l => l.trim());

        // Should have exactly 1 line for this user, commented as deactivated
        const userLines = lines.filter(l => l.includes(testUsername));
        if (userLines.length !== 1) {
            throw new Error(`Expected 1 line for user ${testUsername} in .proxyauth, found ${userLines.length}`);
        }
        if (!userLines[0].startsWith('# DEACTIVATED')) {
            throw new Error(`User line should be commented as DEACTIVATED: ${userLines[0]}`);
        }


        // 6. Assertions
        if (finalUser?.isActive !== false) {
            throw new Error('User should be deactivated');
        }
        if (finalUser?.deactivatedAt === null) {
            throw new Error('deactivatedAt should be set');
        }
        // Check dataUsed was updated (traffic was counted)
        const expectedDataUsed = 10; // 10 MB
        if (Number(finalUser?.dataUsed) < expectedDataUsed) {
            throw new Error(`dataUsed should be at least ${expectedDataUsed} MB, got ${Number(finalUser?.dataUsed) / 1024 / 1024} MB`);
        }


        // 9. Cleanup
        await prisma.proxyUser.delete({
            where: { id: proxyUser.id }
        });
        await fs.unlink(logFile);
        await fs.rm(logsDir, { recursive: true, force: true });


    } catch (error) {
        console.error('\n❌ Integration test FAILED:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testIntegration();
