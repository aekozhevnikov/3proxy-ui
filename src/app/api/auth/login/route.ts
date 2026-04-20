import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { prisma } from "@/src/prisma/db";
import { app } from "@/src/core/config";

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const payload = {
            userId: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
            aud: "3proxy-ui",
            iss: "3proxy-ui"
        };

        const token = jwt.sign(payload, app.jwtSecret, { algorithm: "HS256" });

        const response = NextResponse.json({
            success: true,
            user: { id: user.id, username: user.username, name: user.name, isAdmin: user.isAdmin }
        });

        response.cookies.set("session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60, // 1 hour
            path: "/"
        });

        return response;
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
