export const SESSION_COOKIE = "session";

/** One hour, in seconds. Matches the exp claim on the token. */
export const SESSION_MAX_AGE = 60 * 60;

/**
 * The cookie options were duplicated across login, logout and
 * change-credentials, and they had drifted: login hardcoded secure: false
 * while the other two used NODE_ENV. Which flag a live session carried
 * therefore depended on which endpoint had run last. One definition, used
 * everywhere.
 */
export function sessionCookieOptions() {
    return {
        httpOnly: true,
        // The compose stack publishes port 3000 directly, without TLS, so a
        // strict flag would break the panel there. It is on everywhere else.
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: SESSION_MAX_AGE,
        path: "/"
    };
}
