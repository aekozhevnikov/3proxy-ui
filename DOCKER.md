# 3proxy Admin UI — Docker Deployment

Docker Hub: [aekozh/3proxy-ui](https://hub.docker.com/r/aekozh/3proxy-ui)

A web-based administration interface for managing [3proxy](https://github.com/3proxy/3proxy) proxy servers. This image bundles the Next.js application, fail2ban, and the Docker CLI, but **not** 3proxy itself: the panel manages a separate 3proxy container.

The published image is a multi-arch manifest and runs natively on both `linux/amd64` and `linux/arm64`.

## What the Panel Needs From 3proxy

The panel is a control plane, so a 3proxy instance has to be running alongside it:

- A **shared volume** holding `logs/` and `users/.proxyauth`, mounted into both containers
- **JSON logging** enabled, so traffic can be derived from the log
- The **Docker socket**, so the panel can find and restart the 3proxy container when configuration is
  reloaded

The compose file below wires all three together. If you run 3proxy elsewhere, mount its config
directory at `/etc/3proxy` in this container and set `LOGS_DIR` and `PROXYAUTH_PATH` to match — the
panel's own defaults point at `/app/3proxy`, which the image does not ship.

## Docker Compose (Recommended)

```yaml
services:
  3proxy:
    image: 3proxy/3proxy:0.9.5
    container_name: 3proxy
    restart: unless-stopped
    ports:
      - "3128:3128"   # HTTP proxy
      - "1080:1080"   # SOCKS5 proxy
      - "8088:8088"   # 3proxy admin web panel
    volumes:
      - ./3proxy:/etc/3proxy

  3proxy-ui:
    image: aekozh/3proxy-ui:latest
    container_name: 3proxy-ui
    ports:
      - "3000:3000"   # Web UI
    environment:
      - JWT_SECRET=${JWT_SECRET:?set JWT_SECRET in .env, at least 32 characters}
      - PROXY_DOMAIN=proxy.example.com
      - HTTP_PORT=3128
      - SOCKS_PORT=1080
      - DATABASE_URL=file:/app/data/app.db
      - ENABLE_FAIL2BAN=true
      - FAIL2BAN_MAXRETRY=3
      - FAIL2BAN_BANTIME=1800
      - FAIL2BAN_FINDTIME=600
      - LOGS_DIR=/etc/3proxy/logs
      - PROXYAUTH_PATH=/etc/3proxy/users/.proxyauth
      - PROXY_CONTAINER_NAME=3proxy
      - PROXY_HOST=3proxy
    volumes:
      - 3proxy-data:/app/data
      - ./3proxy:/etc/3proxy
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped

volumes:
  3proxy-data:
```

This is the same stack as `docker-compose.yml` in the repository.

## Running the Panel Alone

`docker run` works for a first look, but without a 3proxy instance the panel cannot verify proxies
or account traffic. It also needs the 3proxy log volume, or fail2ban has no log to watch:

```bash
docker run -d \
  --name 3proxy-ui \
  -p 3000:3000 \
  -e JWT_SECRET="your-secret-at-least-32-characters-long" \
  -e PROXY_DOMAIN="proxy.example.com" \
  -e LOGS_DIR=/etc/3proxy/logs \
  -e PROXYAUTH_PATH=/etc/3proxy/users/.proxyauth \
  -v 3proxy-data:/app/data \
  -v ./3proxy:/etc/3proxy \
  --restart unless-stopped \
  aekozh/3proxy-ui:latest
```

Then open http://localhost:3000 in your browser.

**Default credentials** (change immediately after first login):
- Username: `admin`
- Password: `admin`

## Environment Variables

### Required

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | HS256 signing key for session cookies. **Must be at least 32 characters.** Generate with `openssl rand -hex 32`. | (required) |
| `DATABASE_URL` | SQLite connection string | `file:/app/data/app.db`, set by the entrypoint |

### 3proxy Integration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOGS_DIR` | Directory 3proxy writes its log to. Must match the shared volume. | `/app/3proxy/logs` |
| `PROXYAUTH_PATH` | Path to the `.proxyauth` file. Must match the shared volume. | `/app/3proxy/users/.proxyauth` |
| `PROXY_HOST` | Host or container name used to probe the proxy | `127.0.0.1` |
| `PROXY_CONTAINER_NAME` | Container name `/api/config/reload` looks for when restarting 3proxy | tried in order: this value, `3proxy`, `vpn-3proxy` |
| `PROXY_DOMAIN` | Public domain of the proxy, baked in at build time | `localhost` |
| `HTTP_PORT` | HTTP proxy port, baked in at build time | `3128` |
| `SOCKS_PORT` | SOCKS5 proxy port, baked in at build time | `1080` |

### Traffic and Maintenance

| Variable | Description | Default |
|----------|-------------|---------|
| `TRAFFIC_SYNC_INTERVAL` | Cron schedule for the traffic sync and cleanup job | `*/30 * * * *` (every 30 minutes) |
| `SYNC_INFO_FILE` | Where per-inode log offsets are stored | `./data/traffic-sync.json` |
| `LOG_LEVEL` | Application log verbosity: `debug`, `info`, `warn`, `error` | `info` |

### Fail2ban (Brute-force Protection)

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_FAIL2BAN` | Start fail2ban in the container | `true` |
| `FAIL2BAN_MAXRETRY` | Failed auth attempts before a ban | `3` |
| `FAIL2BAN_BANTIME` | Ban duration in seconds | `1800` (30 min) |
| `FAIL2BAN_FINDTIME` | Window for counting retries, in seconds | `600` (10 min) |

The jail watches `/etc/3proxy/logs/3proxy.log` and covers ports 3128 and 1080. If that log is
missing, fail2ban cannot start; the entrypoint logs a warning and continues without it rather than
aborting the container.

### Panel and Notifications

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_URL` | Public base URL of the panel | `http://localhost:3000` |
| `APP_NAME` | Panel title | `3proxy UI` |
| `APP_DESCRIPTION` | Panel description | `Admin panel for 3proxy` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Seeded on first start if no admin exists | `admin` / `admin` / `Administrator` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for notifications | (optional) |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | not set in the image |

## Ports

Published by the 3proxy container, not by this image:

| Port | Protocol | Description |
|------|----------|-------------|
| `3128` | TCP | HTTP proxy |
| `1080` | TCP | SOCKS5 proxy |
| `8088` | TCP | 3proxy admin web panel |

Published by this image:

| Port | Protocol | Description |
|------|----------|-------------|
| `3000` | TCP | Web UI (Next.js application) |

## Volumes

| Path | Description |
|------|-------------|
| `/app/data` | SQLite database, traffic sync state |
| `/etc/3proxy` | Shared 3proxy config directory: `logs/` and `users/.proxyauth` |
| `/var/lib/fail2ban` | fail2ban persistent state |
| `/var/run/docker.sock` | Docker socket, read-write, needed for configuration reloads |

## Security

1. **Change the default password** immediately after first login.
2. **Set a strong `JWT_SECRET`** — at least 32 random characters:
   ```bash
   openssl rand -hex 32
   ```
3. **fail2ban** is enabled by default and bans IPs with repeated failed proxy authentication.
4. **The Docker socket is mounted read-write**, which is equivalent to root on the host. Anyone who
   can reach the panel's config-reload endpoint can restart containers. Keep the panel behind
   authentication and, ideally, a reverse proxy with TLS.
5. The container runs as root, because fail2ban needs iptables.

## Health Check

```bash
docker exec 3proxy-ui curl -f http://localhost:3000/api/health
```

## Building Locally

```bash
git clone https://github.com/aekozhevnikov/3proxy-ui.git
cd 3proxy-ui
docker build -t 3proxy-ui .
```

## License

MIT
