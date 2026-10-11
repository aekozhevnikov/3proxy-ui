// Fail2ban Test Helpers
// Re-exports and shared utilities for fail2ban test suite

import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const projectRoot = path.resolve(__dirname, "..", "..", "..");

export const TEST_DIR = path.join(process.cwd(), "test-fail2ban");

export const getProjectRoot = () => projectRoot;

export const testRegex = /"error":\{"code":"(407|403)"\}.*"auth":\{"user":"[^"]+"\},"client":\{"ip":"([^"]+)"/;
