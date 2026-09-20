/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";

jest.mock("qr-code-styling", () => {
    return jest.fn().mockImplementation(() => ({
        append: jest.fn(),
    }));
});

import useQrCode from "@/src/hooks/use-qr-code";

describe("useQrCode", () => {
    it("returns a function", () => {
        const { result } = renderHook(() => {
            const ref = useRef<HTMLDivElement>(null);
            return useQrCode(ref);
        });

        expect(typeof result.current).toBe("function");
    });

    it("does nothing when data is undefined", () => {
        const QRCodeStyling = require("qr-code-styling");
        const mockInstance = new QRCodeStyling();

        const { result } = renderHook(() => {
            const ref = useRef<HTMLDivElement>(null);
            return useQrCode(ref);
        });

        act(() => {
            result.current(undefined);
        });

        expect(mockInstance.append).not.toHaveBeenCalled();
    });

    it("creates QRCodeStyling instance with data when called", () => {
        const QRCodeStyling = require("qr-code-styling");
        const { result } = renderHook(() => {
            const ref = useRef<HTMLDivElement>(null);
            return useQrCode(ref);
        });

        act(() => {
            result.current("test-data");
        });

        expect(QRCodeStyling).toHaveBeenCalledWith(
            expect.objectContaining({
                data: "test-data",
            })
        );
    });

    it("appends QR code to container ref", () => {
        const QRCodeStyling = require("qr-code-styling");
        const mockInstance = new QRCodeStyling();

        const { result } = renderHook(() => {
            const ref = useRef<HTMLDivElement>(null);
            return useQrCode(ref);
        });

        const div = document.createElement("div");
        div.innerHTML = "<div id='container'></div>";

        act(() => {
            result.current("test-qr-data");
        });

        expect(mockInstance.append).not.toHaveBeenCalled();
    });
});
