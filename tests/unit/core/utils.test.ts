import { createPageTitle, formatGB, formatDate } from "@/src/core/utils";

describe("createPageTitle", () => {
    it("returns just app name when no title provided", () => {
        expect(createPageTitle()).toBe("3proxy UI");
    });

    it("returns just app name when undefined passed", () => {
        expect(createPageTitle(undefined)).toBe("3proxy UI");
    });

    it("returns formatted title with custom title", () => {
        expect(createPageTitle("Dashboard")).toBe("Dashboard - 3proxy UI");
    });

    it("returns formatted title with user name", () => {
        expect(createPageTitle("Edit User")).toBe("Edit User - 3proxy UI");
    });
});

describe("formatGB", () => {
    it("converts MB to GB with 2 decimal places", () => {
        expect(formatGB(1024)).toBe("1.00 GB");
    });

    it("handles zero", () => {
        expect(formatGB(0)).toBe("0.00 GB");
    });

    it("handles decimal MB values", () => {
        expect(formatGB(1536)).toBe("1.50 GB");
    });

    it("handles large values", () => {
        expect(formatGB(1048576)).toBe("1024.00 GB");
    });
});

describe("formatDate", () => {
    it("returns 'Never' for null", () => {
        expect(formatDate(null)).toBe("Never");
    });

    it("returns 'Never' for undefined", () => {
        expect(formatDate(undefined)).toBe("Never");
    });

    it("formats date in DD.MM.YYYY format", () => {
        const date = new Date("2024-03-15");
        expect(formatDate(date)).toBe("15.03.2024");
    });

    it("formats date string in DD.MM.YYYY format", () => {
        expect(formatDate("2024-12-25")).toBe("25.12.2024");
    });

    it("pads single digit day and month with leading zeros", () => {
        const date = new Date("2024-01-05");
        expect(formatDate(date)).toBe("05.01.2024");
    });
});
