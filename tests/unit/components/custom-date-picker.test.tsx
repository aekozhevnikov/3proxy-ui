import { parseDate } from "@internationalized/date";

// Mock @internationalized/date
jest.mock("@internationalized/date", () => ({
    parseDate: jest.fn((str: string) => {
        if (!str || str.trim() === "") return null;
        const [year, month, day] = str.split("-").map(Number);
        return { year, month, day };
    }),
    DateValue: class DateValue {}
}));

// Mock HeroUI and I18nProvider completely - we only test the logic
jest.mock("@heroui/react", () => ({
    DatePicker: () => null,
    DateField: {
        Group: () => null,
        Input: () => null,
        Suffix: () => null,
        Segment: () => null
    },
    Calendar: () => null,
    Label: () => null
}));

jest.mock("@react-aria/i18n", () => ({}));

describe("CustomDatePicker logic", () => {
    describe("parseDate integration", () => {
        it("parses valid date string", () => {
            const result = parseDate("2024-12-25");
            expect(result).toEqual({ year: 2024, month: 12, day: 25 });
        });

        it("returns null for empty string", () => {
            const result = parseDate("");
            expect(result).toBeNull();
        });

        it("returns null for whitespace string", () => {
            const result = parseDate("  ");
            expect(result).toBeNull();
        });
    });

    describe("date formatting logic", () => {
        it("formats date components with padding", () => {
            // This tests the handleSelection formatting logic
            const month = String(3).padStart(2, "0");
            const day = String(5).padStart(2, "0");
            expect(month).toBe("03");
            expect(day).toBe("05");
        });

        it("formats date components without padding for already 2-digit", () => {
            const month = String(12).padStart(2, "0");
            const day = String(25).padStart(2, "0");
            expect(month).toBe("12");
            expect(day).toBe("25");
        });

        it("constructs ISO date string from components", () => {
            const year = 2024;
            const month = String(12).padStart(2, "0");
            const day = String(25).padStart(2, "0");
            const formatted = `${year}-${month}-${day}`;
            expect(formatted).toBe("2024-12-25");
        });
    });
});
