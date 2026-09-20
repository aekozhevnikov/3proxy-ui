export function createPageTitle(title?: string): string {
    const baseTitle = "3proxy UI";

    if (!title) {
        return baseTitle;
    }

    return `${title} - ${baseTitle}`;
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

export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatRelativeTime(dateString: string | null): string {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return `${days}d ago`;
}

export function formatLogDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
}
