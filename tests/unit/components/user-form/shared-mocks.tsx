// Shared mock data and utilities for UserForm tests
// jest.mock calls for toast-utils and custom-date-picker are handled in jest.setup.dom.js
import { ProxyUser } from "@/src/core/definitions";

export const mockUser: ProxyUser = {
    id: 1,
    username: "existinguser",
    password: "hashedpass",
    isActive: true,
    dataLimit: 10240,
    ipLimit: 1,
    expiresAt: null,
    telegramUserId: null,
    dataUsed: 0,
    deactivatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
};

export const mockOnCancel = jest.fn();
export const mockOnCreate = jest.fn();
export const mockOnUpdate = jest.fn();

export const baseProps = {
    onCreate: mockOnCreate,
    onCancel: mockOnCancel,
};

export const editProps = {
    user: mockUser,
    onUpdate: mockOnUpdate,
    onCancel: mockOnCancel,
};

export const setupMocks = () => {
    jest.clearAllMocks();
    mockOnCancel.mockClear();
    mockOnCreate.mockClear();
    mockOnUpdate.mockClear();
};