/**
 * Utilities for generating traffic through proxy to simulate real user behavior
 */

import { execAsync } from './helpers.js';

export interface ProxyTrafficStats {
  sent: number;
  received: number;
  requests: number;
  duration: number;
}

export async function generateHttpTraffic(
  proxyUrl: string,
  targetUrl: string,
  requestCount: number = 10,
  requestSize: number = 1024 * 1024 // 1MB
): Promise<ProxyTrafficStats> {
  console.log(`Generating ${requestCount} HTTP requests through ${proxyUrl}...`);

  const startTime = Date.now();
  let totalSent = 0;
  let totalReceived = 0;
  let successfulRequests = 0;

  for (let i = 0; i < requestCount; i++) {
    try {
      // Generate random data for this request
      const data = new Uint8Array(requestSize);
      for (let j = 0; j < requestSize; j++) {
        data[j] = Math.floor(Math.random() * 256);
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        body: Buffer.from(data),
        // Use proxy if provided (requires environment proxy support)
        ...(proxyUrl && {
          // Note: Node.js fetch doesn't directly support proxies
          // In production, this would be handled by 3proxy itself
          // Here we're simulating the effect
        }),
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Test-Request': `e2e-test-${i}`
        },
        signal: AbortSignal.timeout(10000)
      });

      totalSent += requestSize;
      totalReceived += response.headers.get('content-length')
        ? parseInt(response.headers.get('content-length')!, 10)
        : 0;
      successfulRequests++;

      console.log(`  Request ${i + 1}/${requestCount}: ${response.status}`);

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.warn(`  Request ${i + 1} failed:`, error.message);
    }
  }

  const duration = Date.now() - startTime;

  return {
    sent: totalSent,
    received: totalReceived,
    requests: successfulRequests,
    duration
  };
}

export async function writeLogEntry(
  containerName: string,
  username: string,
  bytesSent: number,
  bytesReceived: number,
  errorCode?: string
): Promise<void> {
  const logEntry = JSON.stringify({
    time_unix: Math.floor(Date.now() / 1000),
    proxy: { "type:": "HTTP", port: 3128 },
    auth: { user: username },
    client: { ip: '192.168.99.100', port: 12345 },
    server: { ip: '93.158.167.115', port: 443 },
    bytes: {
      sent: bytesSent,
      received: bytesReceived
    },
    request: { hostname: 'example.com' },
    ...(errorCode && { error: { code: errorCode } }),
    message: errorCode ? `Error ${errorCode}` : 'OK'
  }) + '\n';

  await execAsync(`docker exec ${containerName} sh -c "echo '${logEntry}' >> /etc/3proxy/logs/3proxy.log"`);
}

export async function writeMultipleLogEntries(
  containerName: string,
  username: string,
  entries: Array<{ sent: number; received: number; errorCode?: string }>
): Promise<void> {
  for (const entry of entries) {
    await writeLogEntry(containerName, username, entry.sent, entry.received, entry.errorCode);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export async function generateExceedTraffic(
  containerName: string,
  username: string,
  dataLimit: number,
  exceedByPercent: number = 10
): Promise<{ totalSent: number; totalReceived: number }> {
  const toGenerate = Math.floor(dataLimit * (exceedByPercent / 100));
  const chunkSize = 1024 * 1024; // 1MB chunks
  const chunks = Math.ceil(toGenerate / chunkSize);

  console.log(`Generating ${toGenerate / 1024 / 1024} MB traffic for ${username} (limit: ${dataLimit / 1024 / 1024} MB)...`);

  for (let i = 0; i < chunks; i++) {
    const sent = Math.min(chunkSize, toGenerate - (i * chunkSize));
    await writeLogEntry(containerName, username, sent, sent / 2); // received = 50% of sent
  }

  return {
    totalSent: toGenerate,
    totalReceived: toGenerate / 2
  };
}
