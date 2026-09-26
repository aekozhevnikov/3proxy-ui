import { randomInt } from "crypto";

import { crypt } from "nano-md5";

// 3proxy's CR type accepts MD5-crypt ($1$) and BLAKE2b-crypt ($3$). It also
// accepts the traditional DES variant, but that one ignores everything after
// the 8th character of the password and uses only two salt characters, so the
// previous setup both truncated generated passwords and shared one salt across
// every installation.
const CRYPT_PREFIX = "$1$";
const SALT_ALPHABET = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SALT_LENGTH = 8;

function randomSalt(): string {
    let salt = "";

    for (let i = 0; i < SALT_LENGTH; i++) {
        salt += SALT_ALPHABET[randomInt(SALT_ALPHABET.length)];
    }

    return salt;
}

export function hashProxyPassword(password: string): string {
    return crypt(password, CRYPT_PREFIX + randomSalt());
}

// 3proxy treats a leading '$' in a config value as a file-inclusion macro, so
// the hash has to be quoted or 3proxy tries to include a file named "1$...".
export function proxyauthEntry(username: string, password: string): string {
    return `${username}:CR:"${hashProxyPassword(password)}"`;
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
