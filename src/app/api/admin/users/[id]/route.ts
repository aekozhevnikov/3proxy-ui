import { NextRequest, NextResponse } from "next/server";

import { currentSession } from "@/src/core/session";
import { getProxyUserById, deleteProxyUser, updateProxyUser } from "@/src/core/actions/proxy-user";

// Disable caching for GET requests
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await currentSession();

        if (!session.isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const userId = Number(id);

        const user = await getProxyUserById(userId);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch {
        return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await currentSession();

        if (!session.isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const userId = Number(id);

        const body = await request.json();

        const user = await updateProxyUser({
            id: userId,
            username: body.username,
            password: body.password,
            isActive: body.isActive,
            dataLimit: body.dataLimit,
            ipLimit: body.ipLimit,
            telegramUserId: body.telegramUserId,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update user" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await currentSession();

        if (!session.isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const userId = Number(id);

        await deleteProxyUser(userId);

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
