describe("logger", () => {
    let consoleDebug: jest.SpyInstance;
    let consoleInfo: jest.SpyInstance;
    let consoleWarn: jest.SpyInstance;
    let consoleError: jest.SpyInstance;

    beforeEach(() => {
        // Set LOG_LEVEL before module is loaded to enable debug logging
        jest.resetModules();
        process.env.LOG_LEVEL = "debug";

        consoleDebug = jest.spyOn(console, "debug").mockImplementation();
        consoleInfo = jest.spyOn(console, "info").mockImplementation();
        consoleWarn = jest.spyOn(console, "warn").mockImplementation();
        consoleError = jest.spyOn(console, "error").mockImplementation();
    });

    afterEach(() => {
        consoleDebug.mockRestore();
        consoleInfo.mockRestore();
        consoleWarn.mockRestore();
        consoleError.mockRestore();
        delete process.env.LOG_LEVEL;
    });

    describe("debug level", () => {
        it("calls logger.debug which logs via console.debug", () => {
            const { logger } = require("@/src/core/logger");
            logger.debug("test message");
            expect(consoleDebug).toHaveBeenCalledWith("test message");
        });
    });

    describe("info level", () => {
        it("calls logger.info which logs via console.info", () => {
            const { logger } = require("@/src/core/logger");
            logger.info("info message");
            expect(consoleInfo).toHaveBeenCalledWith("info message");
        });
    });

    describe("warn level", () => {
        it("calls logger.warn which logs via console.warn", () => {
            const { logger } = require("@/src/core/logger");
            logger.warn("warn message");
            expect(consoleWarn).toHaveBeenCalledWith("warn message");
        });
    });

    describe("error level", () => {
        it("calls logger.error which logs via console.error", () => {
            const { logger } = require("@/src/core/logger");
            logger.error("error message");
            expect(consoleError).toHaveBeenCalledWith("error message");
        });

        it("logs multiple arguments", () => {
            const { logger } = require("@/src/core/logger");
            logger.error("error:", "details", { code: 500 });
            expect(consoleError).toHaveBeenCalledWith("error:", "details", { code: 500 });
        });
    });

    describe("log level filtering", () => {
        it("does not log debug when LOG_LEVEL is warn", () => {
            jest.resetModules();
            process.env.LOG_LEVEL = "warn";

            const { logger } = require("@/src/core/logger");
            logger.debug("should not appear");

            expect(consoleDebug).not.toHaveBeenCalled();
        });

        it("logs warn when LOG_LEVEL is warn", () => {
            jest.resetModules();
            process.env.LOG_LEVEL = "warn";

            const warnSpy = jest.spyOn(console, "warn").mockImplementation();
            const { logger } = require("@/src/core/logger");
            logger.warn("should appear");

            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });
    });
});
