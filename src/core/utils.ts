export function createPageTitle(title?: string): string {
    const baseTitle = "3proxy UI";

    if (!title) {
        return baseTitle;
    }

    return `${title} - ${baseTitle}`;
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatGB(mb: number): string {
    return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatDate(date: Date | string | null | undefined): string {
    if (!date) return "Never";

    const d = new Date(date);

    // Use fixed format DD.MM.YYYY to avoid hydration mismatches
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
}

export function generateRandomPassword(length: number = 16): string {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);

        password += charset[randomIndex];
    }

    return password;
}
