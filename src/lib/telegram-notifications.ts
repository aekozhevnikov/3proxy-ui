import { logger } from "@/src/core/logger";

export interface TelegramNotificationParams {
    telegramUserId: string;
    username: string;
    dataUsed: number;
    dataLimit: number;
    reason?: string;
}

export interface TelegramNotificationResult {
    success: boolean;
    error?: string;
}

export async function sendTelegramNotification({
    telegramUserId,
    username,
    dataUsed,
    dataLimit,
    reason = "data limit"
}: TelegramNotificationParams): Promise<TelegramNotificationResult> {
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;

        if (!botToken) {
            logger.warn("[maintenance] TELEGRAM_BOT_TOKEN not set, skipping notification");

            return { success: false, error: "TELEGRAM_BOT_TOKEN not set" };
        }

        const message =
            `⚠️ *Account Deactivated*\n\n` +
            `User: *${username}*\n` +
            `Reason: *${reason}*\n` +
            `Data used: *${(dataUsed / 1024 / 1024).toFixed(2)} MB*\n` +
            `Data limit: *${(dataLimit / 1024 / 1024).toFixed(2)} MB*\n` +
            `Your proxy access has been disabled. Please contact support if you need assistance.`;

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: telegramUserId,
                text: message,
                parse_mode: "Markdown"
            })
        });

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.status} ${response.statusText}`);
        }

        logger.info(`[maintenance] Telegram notification sent to user ${username} (${telegramUserId})`);

        return { success: true };
    } catch (error) {
        logger.error("[maintenance] Failed to send Telegram notification:", error);

        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}
