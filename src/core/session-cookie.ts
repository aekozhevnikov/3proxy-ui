export const SESSION_COOKIE = "session";

/** One hour, in seconds. Matches the exp claim on the token. */
export const SESSION_MAX_AGE = 60 * 60;

/**
 * The cookie options were duplicated across login, logout and
 * change-credentials, and they had drifted: login hardcoded secure: false
 * while the other two used NODE_ENV. Which flag a live session carried
 * therefore depended on which endpoint had run last. One definition, used
 * everywhere.
 *
 * The Secure flag is opt-in through SESSION_COOKIE_SECURE rather than derived
 * from NODE_ENV. The standalone server sets NODE_ENV=production unconditionally,
 * so keying off it marked the cookie Secure even though the shipped compose
 * stack serves plain HTTP on port 3000, and a browser refuses to store a Secure
 * cookie that arrives over http, which locked people out. Turn it on only when
 * the panel is actually behind TLS.
 */
export function sessionCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.SESSION_COOKIE_SECURE === "true",
        sameSite: "lax" as const,
        maxAge: SESSION_MAX_AGE,
        path: "/"
    };
}
