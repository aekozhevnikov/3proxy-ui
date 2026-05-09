# 3proxy Admin UI — Docker Deployment

Docker Hub: [hungryking/3proxy-admin](https://hub.docker.com/r/hungryking/3proxy-admin)

A web-based administration interface for managing [3proxy](https://github.com/3proxy/3proxy) proxy servers. This Docker image bundles the Next.js application, fail2ban, and all dependencies into a single container.

## Quick Start

```bash
docker run -d \
  --name 3proxy-admin \
  -p 3000:3000 \
  -p 3128:3128 \
  -p 1080:1080 \
  -e JWT_SECRET="your-secret-at-least-32-characters-long" \
  -e PROXY_DOMAIN="proxy.example.com" \
  -v 3proxy-data:/app/data \
  -v 3proxy-logs:/etc/3proxy/logs \
  --restart unless-stopped \
  hungryking/3proxy-admin:latest
```

Then open http://localhost:3000 in your browser.

**Default credentials** (change immediately after first login):
- Username: `admin`
- Password: `admin`

## Docker Compose (Recommended)

```yaml
version: "3.8"

services:
  3proxy-admin:
    image: hungryking/3proxy-admin:latest
    container_name: 3proxy-admin
    ports:
      - "3000:3000"   # Web UI
      - "3128:3128"   # HTTP proxy
      - "1080:1080"   # SOCKS proxy
    environment:
      - JWT_SECRET=your-secret-at-least-32-characters-long
      - PROXY_DOMAIN=proxy.example.com
      - HTTP_PORT=3128
      - SOCKS_PORT=1080
      - DATABASE_URL=file:/app/data/app.db
      - ENABLE_FAIL2BAN=true
      - FAIL2BAN_MAXRETRY=3
      - FAIL2BAN_BANTIME=1800
      - FAIL2BAN_FINDTIME=600
    volumes:
      - 3proxy-data:/app/data
      - 3proxy-logs:/etc/3proxy/logs
    restart: unless-stopped

volumes:
  3proxy-data:
  3proxy-logs:
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT authentication tokens. **Must be at least 32 characters.** | `my-super-secret-key-that-is-32-chars!` |

### Proxy Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PROXY_DOMAIN` | Domain name for proxy server | `localhost` |
| `HTTP_PORT` | HTTP proxy port | `3128` |
| `SOCKS_PORT` | SOCKS5 proxy port | `1080` |

### Database

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:/app/data/app.db` |

### Fail2ban (Brute-force Protection)

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_FAIL2BAN` | Enable/disable fail2ban | `true` |
| `FAIL2BAN_MAXRETRY` | Number of failed auth attempts before ban | `3` |
| `FAIL2BAN_BANTIME` | Ban duration in seconds | `1800` (30 min) |
| `FAIL2BAN_FINDTIME` | Time window for counting retries in seconds | `600` (10 min) |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `LOGS_DIR` | Path to 3proxy logs directory | `/var/log/3proxy` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Set to `0` to allow self-signed certs | (not set) |

## Ports

| Port | Protocol | Description |
|------|----------|-------------|
| `3000` | TCP | Web UI (Next.js application) |
| `3128` | TCP | HTTP proxy |
| `1080` | TCP | SOCKS5 proxy |

## Volumes

| Path | Description |
|------|-------------|
| `/app/data` | SQLite database and application data |
| `/etc/3proxy/logs` | 3proxy log files (used by fail2ban) |
| `/var/lib/fail2ban` | Fail2ban persistent state |

## Security

1. **Change the default password** immediately after first login.
2. **Set a strong `JWT_SECRET`** — at least 32 random characters:
   ```bash
   openssl rand -hex 32
   ```
3. **fail2ban** is enabled by default and will automatically ban IPs with repeated failed authentication attempts.
4. The container runs as root (required for fail2ban iptables rules). For production, consider running behind a reverse proxy with TLS.

## Health Check

```bash
docker exec 3proxy-admin curl -f http://localhost:3000/api/health
```

## Building Locally

```bash
git clone https://github.com/aekozhevnikov/3proxy-ui.git
cd 3proxy-ui
docker build -t 3proxy-admin .
```

## License

MIT
