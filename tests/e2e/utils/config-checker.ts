/**
 * Utilities for checking 3proxy and fail2ban configuration inside containers
 */

import { execInContainer } from './helpers.js';

export interface Fail2banConfig {
  bantime: number;
  findtime: number;
  maxretry: number;
  jailName: string;
  ports: string[];
  logPath: string;
  filterName: string;
}

export async function getFail2banConfig(containerName: string): Promise<Fail2banConfig> {
  const jailContent = await execInContainer(containerName, 'cat /etc/fail2ban/jail.d/3proxy-docker.local');

  const config: Fail2banConfig = {
    bantime: 0,
    findtime: 0,
    maxretry: 0,
    jailName: '3proxy-docker',
    ports: [],
    logPath: '',
    filterName: '3proxy-docker'
  };

  const bantimeMatch = jailContent.match(/^bantime\s*=\s*(\d+)/m);
  if (bantimeMatch) config.bantime = parseInt(bantimeMatch[1], 10);

  const findtimeMatch = jailContent.match(/^findtime\s*=\s*(\d+)/m);
  if (findtimeMatch) config.findtime = parseInt(findtimeMatch[1], 10);

  const maxretryMatch = jailContent.match(/^maxretry\s*=\s*(\d+)/m);
  if (maxretryMatch) config.maxretry = parseInt(maxretryMatch[1], 10);

  const portMatch = jailContent.match(/^port\s*=\s*([\d,]+)/m);
  if (portMatch) config.ports = portMatch[1].split(',');

  const logpathMatch = jailContent.match(/^logpath\s*=\s*(.+)$/m);
  if (logpathMatch) config.logPath = logpathMatch[1].trim();

  return config;
}

export async function getFailregexPattern(containerName: string): Promise<string> {
  try {
    const filterContent = await execInContainer(containerName, 'cat /etc/fail2ban/filter.d/3proxy-docker.conf');
    const match = filterContent.match(/failregex\s*=\s*(.+)$/m);
    return match ? match[1].trim() : '';
  } catch {
    // Fallback to entrypoint
    const entrypoint = await execInContainer(containerName, 'cat /entrypoint.sh');
    const lines: string[] = [];
    let inFailregex = false;
    for (const line of entrypoint.split('\n')) {
      if (line.includes('failregex')) {
        inFailregex = true;
        lines.push(line);
      } else if (inFailregex && line.trim() && !line.trim().startsWith('.')) {
        break;
      } else if (inFailregex) {
        lines.push(line);
      }
    }
    return lines.join('\n');
  }
}

export async function getIgnoreregexPattern(containerName: string): Promise<string> {
  try {
    const filterContent = await execInContainer(containerName, 'cat /etc/fail2ban/filter.d/3proxy-docker.conf');
    const match = filterContent.match(/ignoreregex\s*=\s*(.+)$/m);
    return match ? match[1].trim() : '';
  } catch {
    const entrypoint = await execInContainer(containerName, 'cat /entrypoint.sh');
    const lines: string[] = [];
    let inIgnoreregex = false;
    for (const line of entrypoint.split('\n')) {
      if (line.includes('ignoreregex')) {
        inIgnoreregex = true;
        lines.push(line);
      } else if (inIgnoreregex && line.trim() && !line.trim().startsWith('.')) {
        break;
      } else if (inIgnoreregex) {
        lines.push(line);
      }
    }
    return lines.join('\n');
  }
}

export async function verify3proxyLogFormat(containerName: string): Promise<{ format: string; logPath: string }> {
  const configContent = await execInContainer(containerName, 'cat /etc/3proxy/3proxy.cfg');

  // Check for JSON format
  if (!configContent.includes('logformat') || !configContent.includes('time_unix')) {
    throw new Error('3proxy.cfg should use JSON log format');
  }

  // Extract log path
  const logMatch = configContent.match(/log\s+(\S+)\s+D/);
  if (!logMatch) {
    throw new Error('3proxy.cfg should have log directive with D (JSON) format');
  }

  return {
    format: 'json',
    logPath: logMatch[1]
  };
}

export async function getProxyauthContent(containerName: string): Promise<string> {
  return await execInContainer(containerName, 'cat /app/3proxy/users/.proxyauth');
}

export async function verifyJailStatus(containerName: string): Promise<{ active: boolean; bannedCount: number; bannedIPs: string[] }> {
  try {
    const status = await execInContainer(containerName, 'fail2ban-client status 3proxy-docker');

    const bannedIPsMatch = status.match(/Banned IP list:\s*(.+)/);
    const bannedIPs = bannedIPsMatch ? bannedIPsMatch[1].trim().split(/\s+/) : [];

    const currentlyBannedMatch = status.match(/Currently banned:\s*(\d+)/);
    const bannedCount = currentlyBannedMatch ? parseInt(currentlyBannedMatch[1], 10) : 0;

    return {
      active: true,
      bannedCount,
      bannedIPs
    };
  } catch (error: any) {
    if (error.message.includes('not running') || error.message.includes('No such jail')) {
      return {
        active: false,
        bannedCount: 0,
        bannedIPs: []
      };
    }
    throw error;
  }
}

export async function getIptablesRules(containerName: string, chainName: string = 'f2b-3proxy-docker'): Promise<string> {
  try {
    return await execInContainer(containerName, `iptables -L ${chainName} -n`);
  } catch {
    return '';
  }
}
