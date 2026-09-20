import { mocked } from '@/tests/unit/test-utils/mock-helpers';
import { render } from "@testing-library/react";

jest.mock("next/navigation", () => ({
    redirect: jest.fn(),
    __esModule: true,
}));

import { redirect } from "next/navigation";
const mockRedirect = mocked(redirect);

import AdminRedirectPage from "@/src/app/admin/page";

describe("AdminRedirectPage", () => {
    beforeEach(() => {
        mockRedirect.mockClear();
    });

    it("calls redirect to /admin/dashboard", () => {
        AdminRedirectPage();
        expect(mockRedirect).toHaveBeenCalledWith("/admin/dashboard");
    });

    it("calls redirect only once", () => {
        AdminRedirectPage();
        AdminRedirectPage();
        expect(mockRedirect).toHaveBeenCalledTimes(2);
    });
});
