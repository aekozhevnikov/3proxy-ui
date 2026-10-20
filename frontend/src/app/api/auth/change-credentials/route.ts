import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { prisma } from "@/src/prisma/db";
import { app } from "@/src/core/config";
import { SESSION_COOKIE, SESSION_MAX_AGE, sessionCookieOptions } from "@/src/core/session-cookie";

export async function POST(request: NextRequest) {
    try {
        const { username, currentPassword, newPassword } = await request.json();

        if (!username || !currentPassword) {
            return NextResponse.json({ error: "Username and current password are required" }, { status: 400 });
        }

        // Get current session to identify user
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;

        if (!sessionCookie) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const decoded = jwt.verify(sessionCookie, app.jwtSecret, {
            audience: "3proxy-ui",
            issuer: "3proxy-ui",
            algorithms: ["HS256"]
        });

        if (
            typeof decoded !== "object" ||
            decoded === null ||
            !("userId" in decoded) ||
            typeof decoded.userId !== "number"
        ) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }
        const sessionVersion =
            "sessionVersion" in decoded && typeof decoded.sessionVersion === "number" ? decoded.sessionVersion : 0;
        const payload: { userId: number; sessionVersion: number } = { userId: decoded.userId, sessionVersion };

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // This endpoint mints a fresh token, so it is the one place a revoked
        // token could resurrect itself. currentSession compares the version
        // against the database; this must too, before issuing a replacement.
        const tokenVersion =
            "sessionVersion" in decoded && typeof decoded.sessionVersion === "number" ? decoded.sessionVersion : 0;

        if (tokenVersion !== user.sessionVersion) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
        }

        // Check if username is taken by another user
        if (username !== user.username) {
            const existingUser = await prisma.user.findFirst({
                where: { username }
            });

            if (existingUser) {
                return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
            }
        }

        // Update user
        const updateData: { username: string; password?: string; sessionVersion?: number } = {
            username
        };

        // Update password if provided
        if (newPassword) {
            updateData.password = await bcrypt.hash(newPassword, 10);
            // Every token issued before this stops verifying, so a lost device
            // cannot keep its session for the rest of the hour. The increment
            // comes from the stored row, not from the token, so two devices
            // changing the password at once cannot land on the same version.
            updateData.sessionVersion = user.sessionVersion + 1;
        }

        const updatedUser = await prisma.user.update({
            where: { id: payload.userId },
            data: updateData
        });

        const newPayload = {
            userId: updatedUser.id,
            username: updatedUser.username,
            isAdmin: updatedUser.isAdmin,
            sessionVersion: updatedUser.sessionVersion,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
            aud: "3proxy-ui",
            iss: "3proxy-ui"
        };

        const newToken = jwt.sign(newPayload, app.jwtSecret, { algorithm: "HS256" });

        // Set new cookie
        const response = NextResponse.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                name: updatedUser.name,
                isAdmin: updatedUser.isAdmin
            }
        });

        response.cookies.set(SESSION_COOKIE, newToken, sessionCookieOptions());

        return response;
    } catch (error) {
        console.error("Change credentials error:", error);

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
