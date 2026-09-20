/**
 * Utilities for checking 3proxy and fail2ban configuration inside containers
 */

import { execInContainer } from "./helpers.js";

export interface Fail2banConfig {
    bantime: number;
    findtime: number;
    maxretry: number;
    jailName: string;
    ports: string[];
    logPath: string;
    filterName: string;
}
