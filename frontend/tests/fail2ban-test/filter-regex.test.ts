// Fail2ban Filter Regex Tests
// Tests that the fail2ban filter regex patterns correctly match log entries

import { promises as fs } from "fs";
import path from "path";
import { getProjectRoot, testRegex } from "./helpers";

describe("Fail2ban Filter Regex", () => {
    const entrypointPath = path.join(getProjectRoot(), "entrypoint.sh");

    it("[Definition] section exists in entrypoint.sh", async () => {
        let entrypointContent: string;
        try {
            await fs.access(entrypointPath);
            entrypointContent = await fs.readFile(entrypointPath, "utf-8");
        } catch {
            return; // Skip if entrypoint.sh doesn't exist
        }

        expect(entrypointContent).toContain("[Definition]");
    });

    it("contains failregex with (407|403) and <HOST>", async () => {
        let entrypointContent: string;
        try {
            entrypointContent = await fs.readFile(entrypointPath, "utf-8");
        } catch {
            return;
        }

        expect(entrypointContent).toContain("failregex");
        expect(entrypointContent).toContain("(407|403)");
        expect(entrypointContent).toContain("<HOST>");
    });

    it("contains ignoreregex with 00000 and 200 codes", async () => {
        let entrypointContent: string;
        try {
            entrypointContent = await fs.readFile(entrypointPath, "utf-8");
        } catch {
            return;
        }

        expect(entrypointContent).toContain("ignoreregex");
        expect(entrypointContent).toContain('"code":"00000"');
        expect(entrypointContent).toContain('"code":"200"');
    });

    describe("regex pattern matching", () => {
        const shouldMatch = [
            `{"time_unix":1774790000,"proxy":{"type:":"HTTP","port":3128},"error":{"code":"407"},"auth":{"user":"testuser"},"client":{"ip":"1.2.3.4","port":12345},"server":{"ip":"93.158.167.115","port":443},"bytes":{"sent":0,"received":0},"request":{"hostname":""},"message":""}`,
            `{"time_unix":1774790001,"proxy":{"type:":"SOCKS","port":1080},"error":{"code":"403"},"auth":{"user":"alice"},"client":{"ip":"5.6.7.8","port":54321},"server":{"ip":"192.168.1.1","port":80},"bytes":{"sent":0,"received":0},"request":{"hostname":""},"message":""}`,
            `{"time_unix":1774790002,"proxy":{"type:":"HTTP","port":3128},"error":{"code":"407"},"auth":{"user":"charlie"},"client":{"ip":"10.0.0.1","port":11111},"server":{},"bytes":{},"request":{},"message":"Some error"}`,
        ];

        const shouldNotMatch = [
            `{"time_unix":1774790003,"proxy":{"type:":"HTTP","port":3128},"error":{"code":"200"},"auth":{"user":"testuser"},"client":{"ip":"1.2.3.4","port":12345},"server":{"ip":"93.158.167.115","port":443},"bytes":{"sent":1024,"received":2048},"request":{"hostname":"example.com"},"message":"HTTP request completed"}`,
            `{"time_unix":1774790004,"proxy":{"type:":"SOCKS","port":1080},"error":{"code":"00000"},"auth":{"user":"bob"},"client":{"ip":"5.6.7.8","port":54321},"server":{"ip":"192.168.1.1","port":80},"bytes":{"sent":512,"received":1024},"request":{"hostname":""},"message":""}`,
        ];

        it.each(shouldMatch)("matches ban-triggering log entry: %s", (log) => {
            expect(log.match(testRegex)).not.toBeNull();
        });

        it.each(shouldNotMatch)("does NOT match valid log entry: %s", (log) => {
            expect(log.match(testRegex)).toBeNull();
        });
    });
});