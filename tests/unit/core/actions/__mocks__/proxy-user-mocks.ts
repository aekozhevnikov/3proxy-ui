// Shared mock data and utilities for proxy-user action tests
// jest.mock calls must be in each test file for proper hoisting

import { ProxyUser } from "@/src/core/definitions";

export const mockUser: ProxyUser = {
    id: 1,
    username: "testuser",
    password: "hashedpass",
    isActive: true,
    dataLimit: 10240,
    ipLimit: 1,
    telegramUserId: null,
    expiresAt: null,
    deactivatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    dataUsed: 0,
};

export const mockData = {
    mockUser,
};