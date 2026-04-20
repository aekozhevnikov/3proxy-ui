import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { prisma } from "@/src/prisma/db";
import { app } from "@/src/core/config";

export async function POST(request: NextRequest) {
    try {
        const { username, currentPassword, newPassword } = await request.json();

        if (!username || !currentPassword) {
            return NextResponse.json({ error: "Username and current password are required" }, { status: 400 });
        }

        // Get current session to identify user
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const payload = jwt.verify(sessionCookie, app.jwtSecret, {
            audience: "3proxy-ui",
            issuer: "3proxy-ui",
            algorithms: ["HS256"]
        }) as { userId: number };

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
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
        const updateData: { username: string; password?: string } = {
            username
        };

        // Update password if provided
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            updateData.password = hashedPassword;
        }

        const updatedUser = await prisma.user.update({
            where: { id: payload.userId },
            data: updateData
        });

        // Generate new JWT token with updated username if it changed
        const newPayload = {
            userId: updatedUser.id,
            username: updatedUser.username,
            isAdmin: updatedUser.isAdmin,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
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

        response.cookies.set("session", newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60, // 1 hour
            path: "/"
        });

        return response;
    } catch (error) {
        console.error("Change credentials error:", error);

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
