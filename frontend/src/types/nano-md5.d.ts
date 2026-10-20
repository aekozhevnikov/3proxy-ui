declare module "nano-md5" {
    export function md5(data: string): string;
    export function md5(
        data: string,
        options?: { encoding?: "hex" | "base64" | "buffer"; ignoreErrors?: boolean; stripLineBreaks?: boolean }
    ): string;
    export function crypt(password: string, salt: string): string;
    export function crypt(
        password: string,
        salt: string,
        options?: { encoding?: "hex" | "base64"; stripLineBreaks?: boolean }
    ): string;
    export function getMd5OfString(data: string): string;
    export const defaultEncoding: string;
    export const defaultStripLineBreaks: boolean;
}
