import { prisma } from "@/src/prisma/db";
import { logger } from "@/src/core/logger";
import { sendTelegramNotification } from "@/src/lib/telegram-notifications";

export interface TrafficSyncParams {
    trafficMap: Map<string, { sent: number; received: number; requests: number }>;
    now: Date;
}

export async function processExpiration(now: Date): Promise<{
    deactivatedCount: number;
    updatedCount: number;
}> {
    const expiredUsers = await prisma.proxyUser.findMany({
        where: {
            isActive: true,
            expiresAt: { lt: now }
        }
    });

    let deactivatedCount = 0;

    for (const user of expiredUsers) {
        await prisma.proxyUser.update({
            where: { id: user.id },
            data: {
                isActive: false,
                deactivatedAt: now
            }
        });
        deactivatedCount++;

        if (user.telegramUserId) {
            await sendTelegramNotification({
                telegramUserId: user.telegramUserId,
                username: user.username,
                dataUsed: Number(user.dataUsed),
                dataLimit: Number(user.dataLimit || 0),
                reason: "subscription expired"
            });
        }

        logger.debug(
            `[maintenance] User ${user.username} deactivated due to expiration (expired at: ${user.expiresAt})`
        );
    }

    if (expiredUsers.length > 0) {
        logger.debug(`[maintenance] Deactivated ${expiredUsers.length} users due to expiration`);
    }

    return { deactivatedCount, updatedCount: 0 };
}

export async function processTrafficLimits({
    trafficMap,
    now
}: TrafficSyncParams): Promise<{ updatedCount: number; deactivatedCount: number; totalTraffic: number }> {
    let updatedCount = 0;
    let deactivatedCount = 0;
    let totalTraffic = 0;

    for (const [username, stats] of trafficMap.entries()) {
        const totalUsed = stats.sent + stats.received;

        totalTraffic += totalUsed;

        const user = await prisma.proxyUser.findFirst({
            where: { username }
        });

        if (!user) continue;

        const newDataUsed = Number(user.dataUsed) + totalUsed;
        const shouldDeactivate =
            user.dataLimit !== null && newDataUsed >= Number(user.dataLimit) && user.isActive === true;

        await prisma.proxyUser.update({
            where: { id: user.id },
            data: {
                dataUsed: newDataUsed
            }
        });

        if (shouldDeactivate) {
            await prisma.proxyUser.update({
                where: { id: user.id },
                data: {
                    isActive: false,
                    deactivatedAt: now
                }
            });
            deactivatedCount++;

            if (user.telegramUserId) {
                await sendTelegramNotification({
                    telegramUserId: user.telegramUserId,
                    username: user.username,
                    dataUsed: newDataUsed,
                    dataLimit: Number(user.dataLimit!),
                    reason: "data limit exceeded"
                });
            }

            logger.debug(
                `[maintenance] User ${user.username} deactivated due to exceeding data limit (${newDataUsed / 1024 / 1024} MB / ${Number(user.dataLimit) / 1024 / 1024} MB)`
            );
        }

        updatedCount++;
    }

    return { updatedCount, deactivatedCount, totalTraffic };
}
