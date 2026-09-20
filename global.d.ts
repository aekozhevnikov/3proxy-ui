// global.d.ts
declare global {
    var Request: typeof globalThis.Request | undefined;
    var Response: typeof globalThis.Response | undefined;
    var Headers: typeof globalThis.Headers | undefined;
    var TextEncoder: typeof globalThis.TextEncoder | undefined;
}
export {};
