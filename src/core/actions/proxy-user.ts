"use server";

import { revalidatePath } from "next/cache";

import { update3proxyConfig } from "./config";

import prisma from "@/prisma/db";
import { NewProxyUserRequest, EditProxyUserRequest, ProxyUser } from "@/src/core/definitions";

export async function getAllProxyUsers(): Promise<ProxyUser[]> {
    const users = await prisma.proxyUser.findMany({
        orderBy: {
            createdAt: "desc"
        }
    });

    return users.map((user) => ({
        ...user,
        dataLimit: user.dataLimit ? Number(user.dataLimit) : null,
        dataUsed: Number(user.dataUsed)
    }));
}

export async function getProxyUserById(id: number): Promise<ProxyUser | null> {
    const user = await prisma.proxyUser.findUnique({
        where: { id }
    });

    if (!user) return null;

    return {
        ...user,
        dataLimit: user.dataLimit ? Number(user.dataLimit) : null,
        dataUsed: Number(user.dataUsed)
    };
}

export async function createProxyUser(data: NewProxyUserRequest): Promise<ProxyUser> {
    const existing = await prisma.proxyUser.findFirst({
        where: { username: data.username }
    });

    if (existing) {
        throw new Error(`User with username "${data.username}" already exists`);
    }

    // Validate: if creating active user, check expiration date (if provided)
    const isActive = data.isActive ?? true;

    if (isActive && data.expiresAt) {
        const expirationDate = new Date(data.expiresAt);
        const now = new Date();

        if (expirationDate <= now) {
            throw new Error(
                "Cannot create user with expired or past expiration date. Please set a future expiration date or deactivate the user."
            );
        }
    }

    const user = await prisma.proxyUser.create({
        data: {
            username: data.username,
            password: data.password,
            isActive,
            dataLimit: data.dataLimit ?? null,
            ipLimit: data.ipLimit ?? 1,
            telegramUserId: data.telegramUserId ?? null,
            expiresAt: data.expiresAt ?? null
        }
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/users/create");

    // Update .proxyauth file
    await update3proxyConfig();

    // Convert BigInt to Number
    return {
        ...user,
        dataLimit: user.dataLimit ? Number(user.dataLimit) : null,
        dataUsed: Number(user.dataUsed)
    };
}

export async function updateProxyUser(data: EditProxyUserRequest): Promise<ProxyUser> {
    const existing = await prisma.proxyUser.findUnique({
        where: { id: data.id }
    });

    if (!existing) {
        throw new Error(`User with id ${data.id} not found`);
    }

    const isActiveNow = data.isActive ?? existing.isActive;

    // Validate: if activating user, check that expiration date is in the future (if provided)
    if (isActiveNow && data.expiresAt) {
        const expirationDate = new Date(data.expiresAt);
        const now = new Date();

        if (expirationDate <= now) {
            throw new Error(
                "Cannot activate user with expired or past expiration date. Please set a future expiration date."
            );
        }
    }

    const updateData: Partial<ProxyUser> = {
        username: data.username,
        isActive: isActiveNow,
        dataLimit: data.dataLimit ?? null,
        ipLimit: data.ipLimit ?? existing.ipLimit,
        telegramUserId: data.telegramUserId ?? null,
        expiresAt: data.expiresAt ?? null
    };

    // If deactivating manually, set deactivatedAt
    if (existing.isActive && !isActiveNow) {
        updateData.deactivatedAt = new Date();
    } else if (existing.isActive === false && isActiveNow) {
        // If reactivating manually, clear deactivatedAt
        updateData.deactivatedAt = null;
    }

    if (data.password) {
        updateData.password = data.password;
    }

    const user = await prisma.proxyUser.update({
        where: { id: data.id },
        data: updateData
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${data.id}/edit`);

    // Update .proxyauth file
    await update3proxyConfig();

    // Convert BigInt to Number
    return {
        ...user,
        dataLimit: user.dataLimit ? Number(user.dataLimit) : null,
        dataUsed: Number(user.dataUsed)
    };
}

export async function deleteProxyUser(id: number): Promise<void> {
    const existing = await prisma.proxyUser.findUnique({
        where: { id }
    });

    if (!existing) {
        throw new Error(`User with id ${id} not found`);
    }

    await prisma.proxyUser.delete({
        where: { id }
    });

    revalidatePath("/admin/users");

    // Update .proxyauth file
    await update3proxyConfig();
}

export async function incrementDataUsage(username: string, bytes: number): Promise<void> {
    // Convert bytes to MB
    const mb = bytes / (1024 * 1024);

    await prisma.proxyUser.update({
        where: { username },
        data: {
            dataUsed: {
                increment: mb
            }
        }
    });
}
