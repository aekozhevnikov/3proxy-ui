import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "@/src/prisma/db";
import { app } from "@/src/core/config";
import { logger } from "@/src/core/logger";
import { SESSION_COOKIE, SESSION_MAX_AGE, sessionCookieOptions } from "@/src/core/session-cookie";

/**
 * Failed attempts are counted per username and source address with an
 * exponential backoff. This is in-process state, which matches a single
 * self-hosted panel, but it does not survive a restart and does not span
 * replicas.
 */
const BASE_DELAY_MS = 250;
const WINDOW_MS = 15 * 60 * 1000;

interface AttemptRecord {
    failures: number;
    firstFailureAt: number;
    lockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();

/** Test seam: the counter is module state, so suites need a way to start clean. */
export function resetLoginAttempts(): void {
    attempts.clear();
}

/**
 * Keyed on the username alone. It used to include the leftmost
 * x-forwarded-for, which the caller sets freely, so rotating the header per
 * request gave unlimited attempts at the configured rate and the map grew
 * without bound. The cost is that an attacker can lock a known account out
 * for the backoff window, which is the better trade for a self-hosted panel
 * with one admin account.
 */
function attemptKey(username: string): string {
    return username;
}

/** Keeps the counter map bounded when accounts are probed that do not exist. */
function sweep(now: number): void {
    for (const [key, record] of attempts) {
        if (record.lockedUntil <= now) {
            attempts.delete(key);
        }
    }
}

function lockedFor(record: AttemptRecord | undefined, now: number): number {
    if (!record || record.lockedUntil <= now) {
        return 0;
    }

    return record.lockedUntil - now;
}

function recordFailure(key: string, now: number): void {
    const existing = attempts.get(key);
    const withinWindow = existing !== undefined && now - existing.firstFailureAt < WINDOW_MS;
    const failures = withinWindow ? existing.failures + 1 : 1;
    const backoff = BASE_DELAY_MS * 2 ** Math.min(failures - 1, 6);

    attempts.set(key, {
        failures,
        firstFailureAt: withinWindow ? existing.firstFailureAt : now,
        lockedUntil: now + backoff
    });
}

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
        }

        const now = Date.now();

        sweep(now);

        const key = attemptKey(username);
        const remaining = lockedFor(attempts.get(key), now);

        if (remaining > 0) {
            logger.warn(`[login] throttled "${username}" for ${remaining}ms after repeated failures`);

            return NextResponse.json(
                { error: "Too many failed attempts. Try again later." },
                { status: 429, headers: { "Retry-After": String(Math.ceil(remaining / 1000)) } }
            );
        }

        const user = await prisma.user.findFirst({
            where: { username }
        });

        // The same message and status whether the account is missing or the
        // password is wrong, so the endpoint is not a user enumerator.
        if (!user) {
            recordFailure(key, Date.now());
            logger.warn(`[login] failed for unknown user "${username}"`);

            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            recordFailure(key, Date.now());
            logger.warn(`[login] failed for "${username}"`);

            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        attempts.delete(key);

        const payload = {
            userId: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            // Bumped whenever the password changes, so tokens minted before it
            // stop verifying. Checked in currentSession.
            sessionVersion: user.sessionVersion,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
            aud: "3proxy-ui",
            iss: "3proxy-ui"
        };

        const token = jwt.sign(payload, app.jwtSecret, { algorithm: "HS256" });

        logger.info(`[login] "${user.username}" signed in`);

        const response = NextResponse.json({
            success: true,
            user: { id: user.id, username: user.username, name: user.name, isAdmin: user.isAdmin }
        });

        response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());

        return response;
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
