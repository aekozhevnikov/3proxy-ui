import { crypt } from "nano-md5";

const SALT = "qwer";

export function hashProxyPassword(password: string): string {
    return crypt(password, SALT);
}

// Generate cryptographically secure random password like: openssl rand -base64 24
export function generatePassword(): string {
    const bytes = new Uint8Array(24);

    crypto.getRandomValues(bytes);

    let binary = "";

    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary).replace(/=+$/, "");
}
