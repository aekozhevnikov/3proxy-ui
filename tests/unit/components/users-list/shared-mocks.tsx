import { mocked, mockResponse } from '@/tests/unit/test-utils/mock-helpers';
// Shared mock data and utilities for UsersList tests
// jest.mock calls for common modules are in jest.setup.dom.js / jest.setup.js

import { ProxyUser } from "@/src/core/definitions";

export const mockUsers: ProxyUser[] = [
    {
        id: 1,
        username: "activeuser",
        password: "pass1",
        isActive: true,
        dataLimit: 10240,
        ipLimit: 1,
        expiresAt: null,
        telegramUserId: null,
        dataUsed: 0,
        deactivatedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        id: 2,
        username: "inactiveuser",
        password: "pass2",
        isActive: false,
        dataLimit: 5120,
        ipLimit: 2,
        expiresAt: new Date("2024-06-01"),
        telegramUserId: "123456",
        dataUsed: 0,
        deactivatedAt: new Date("2024-06-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
    {
        id: 3,
        username: "anotheractive",
        password: "pass3",
        isActive: true,
        dataLimit: null,
        ipLimit: 1,
        expiresAt: null,
        telegramUserId: null,
        dataUsed: 0,
        deactivatedAt: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    },
];

global.fetch = jest.fn();

export const setupMocks = () => {
    jest.clearAllMocks();
    mocked(global.fetch).mockImplementation((input: string | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url.startsWith("/api/admin/users/") && !url.endsWith("/api/admin/users")) {
            const id = Number(url.split("/").pop());
            const user = mockUsers.find((u) => u.id === id);
            return Promise.resolve(mockResponse({ success: !!user, user: user ?? null }, { ok: !!user }));
        }

        return Promise.resolve(mockResponse({ success: true, users: mockUsers }));
    });
};

export const mockUser = mockUsers[0];
