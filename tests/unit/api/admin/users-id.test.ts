/**
 * @jest-environment node
 */

import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { GET, PUT, DELETE } from "@/src/app/api/admin/users/[id]/route";
import { NextRequest } from "next/server";
import { getProxyUserById, deleteProxyUser, updateProxyUser } from "@/src/core/actions/proxy-user";
import { ProxyUser } from "@/src/core/definitions";

jest.mock("@/src/core/session", () => ({
    currentSession: jest.fn(),
}));

jest.mock("@/src/core/actions/proxy-user", () => ({
    getProxyUserById: jest.fn(),
    deleteProxyUser: jest.fn(),
    updateProxyUser: jest.fn(),
}));

import { currentSession } from "@/src/core/session";

const mockParams = Promise.resolve({ id: "1" });

describe("admin/users/[id] API", () => {
    describe("GET", () => {
        beforeEach(() => {
            mocked(currentSession).mockResolvedValue({ isAuthorized: true });
        });

        it("returns 401 when unauthorized", async () => {
            mocked(currentSession).mockResolvedValue({ isAuthorized: false });

            const request = new NextRequest("http://localhost/api/admin/users/1");
            const result = await GET(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(401);
            expect(data.error).toBe("Unauthorized");
        });

        it("returns user data when found", async () => {
            mocked(getProxyUserById).mockResolvedValue({
                id: 1,
                username: "testuser",
                isActive: true,
            } as ProxyUser);

            const request = new NextRequest("http://localhost/api/admin/users/1");
            const result = await GET(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(200);
            expect(data.user.username).toBe("testuser");
        });

        it("returns 404 when user not found", async () => {
            mocked(getProxyUserById).mockResolvedValue(null);

            const request = new NextRequest("http://localhost/api/admin/users/1");
            const result = await GET(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(404);
            expect(data.error).toBe("User not found");
        });

        it("returns 500 on error", async () => {
            mocked(getProxyUserById).mockRejectedValue(new Error("DB error"));

            const request = new NextRequest("http://localhost/api/admin/users/1");
            const result = await GET(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(500);
            expect(data.error).toBe("Failed to get user");
        });
    });

    describe("PUT", () => {
        beforeEach(() => {
            mocked(currentSession).mockResolvedValue({ isAuthorized: true });
        });

        it("returns 401 when unauthorized", async () => {
            mocked(currentSession).mockResolvedValue({ isAuthorized: false });

            const request = new NextRequest("http://localhost/api/admin/users/1", {
                method: "PUT",
                body: JSON.stringify({ username: "updated" }),
            });
            const result = await PUT(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(401);
            expect(data.error).toBe("Unauthorized");
        });

        it("updates user successfully", async () => {
            mocked(updateProxyUser).mockResolvedValue({
                id: 1,
                username: "updated",
            } as ProxyUser);

            const request = new NextRequest("http://localhost/api/admin/users/1", {
                method: "PUT",
                body: JSON.stringify({ username: "updated", password: "newpass" }),
            });
            const result = await PUT(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.user.username).toBe("updated");
        });

        it("returns 500 on error", async () => {
            mocked(updateProxyUser).mockRejectedValue(new Error("Update failed"));

            const request = new NextRequest("http://localhost/api/admin/users/1", {
                method: "PUT",
                body: JSON.stringify({ username: "updated" }),
            });
            const result = await PUT(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(500);
            expect(data.error).toBe("Update failed");
        });
    });

    describe("DELETE", () => {
        beforeEach(() => {
            mocked(currentSession).mockResolvedValue({ isAuthorized: true });
        });

        it("returns 401 when unauthorized", async () => {
            mocked(currentSession).mockResolvedValue({ isAuthorized: false });

            const request = new NextRequest("http://localhost/api/admin/users/1", {
                method: "DELETE",
            });
            const result = await DELETE(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(401);
            expect(data.error).toBe("Unauthorized");
        });

        it("deletes user successfully", async () => {
            mocked(deleteProxyUser).mockResolvedValue(undefined);

            const request = new NextRequest("http://localhost/api/admin/users/1", {
                method: "DELETE",
            });
            const result = await DELETE(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(200);
            expect(data.success).toBe(true);
            expect(deleteProxyUser).toHaveBeenCalledWith(1);
        });

        it("returns 500 on error", async () => {
            mocked(deleteProxyUser).mockRejectedValue(new Error("Failed to delete user"));

            const request = new NextRequest("http://localhost/api/admin/users/1", {
                method: "DELETE",
            });
            const result = await DELETE(request, { params: mockParams });
            const data = await result.json();

            expect(result.status).toBe(500);
            expect(data.error).toBe("Failed to delete user");
        });
    });
});
