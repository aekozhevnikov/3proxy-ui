const puppeteer = require("puppeteer");
const path = require("path");
const http = require("http");

const BASE_URL = "http://localhost:3000";
const OUTPUT_DIR = path.join(__dirname, "..", "screenshots");

const pages = [
  { path: "/", name: "home" },
  { path: "/login", name: "login" },
  { path: "/admin", name: "admin-dashboard" },
  { path: "/admin/users", name: "admin-users" },
  { path: "/admin/users/create", name: "admin-users-create" },
  { path: "/admin/profile", name: "admin-profile" },
];

const devices = [
  { name: "macbook", device: null, viewport: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false } },
  { name: "ipad", device: "iPad Pro 11" },
  { name: "iphone", device: "iPhone 15 Pro" },
];

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  // Login via API first
  console.log("Logging in via API...");
  try {
    const res = await httpPost(`${BASE_URL}/api/auth/login`, {
      username: "admin",
      password: "admin",
    });
    console.log("Login response status:", res.status);

    // Extract cookies from response
    const cookies = res.headers["set-cookie"];
    if (cookies) {
      console.log("Got session cookies");
    }
  } catch (err) {
    console.log("API login failed, will try form login:", err.message);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const d of devices) {
    const page = await browser.newPage();
    if (d.device) {
      const device = puppeteer.KnownDevices[d.device];
      await page.emulate(device);
    } else {
      await page.setViewport(d.viewport);
    }

    // Try to login via form if API didn't set cookies
    console.log(`[${d.name}] Ensuring logged in...`);
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle0", timeout: 15000 });
      // Check if we're on login page
      const url = page.url();
      if (url.includes("/login")) {
        console.log(`[${d.name}] On login page, submitting form...`);
        await page.type('#username', "admin");
        await page.type('#password', "admin");
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 10000 }).catch(() => {});
        console.log(`[${d.name}] Logged in, now at: ${page.url()}`);
      } else {
        console.log(`[${d.name}] Already logged in or redirected to: ${url}`);
      }
    } catch (err) {
      console.log(`[${d.name}] Login attempt: ${err.message}`);
    }

    for (const p of pages) {
      const url = `${BASE_URL}${p.path}`;
      console.log(`[${d.name}] Screenshotting: ${url}`);

      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        // Wait for any loading spinners to disappear
        await page.waitForFunction(
          () => !document.querySelector(".animate-spin"),
          { timeout: 5000 }
        ).catch(() => {});
        // Small delay for any animations
        await new Promise((r) => setTimeout(r, 500));

        const filename = `${p.name}-${d.name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`  ✓ Saved: ${filename}`);
      } catch (err) {
        console.log(`  ✗ Failed: ${err.message}`);
      }
    }

    await page.close();
  }

  await browser.close();
  console.log("\nDone! Screenshots saved to:", OUTPUT_DIR);
})();
