#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-file:/app/data/app.db}"

echo "=== 3proxy-ui Starting ==="

# ============================================
# Database initialization is handled by start.js (prisma migrate deploy + seed)
# ============================================

# ============================================
# Configure and start fail2ban
# ============================================
if [ "${ENABLE_FAIL2BAN:-true}" = "true" ]; then
    echo "→ Configuring fail2ban..."

    # Generate jail configuration dynamically based on environment variables
    cat > /etc/fail2ban/jail.d/3proxy-docker.local <<EOF
[3proxy-docker]
enabled = true
port = 3128,1080
protocol = tcp
filter = 3proxy-docker
logpath = /etc/3proxy/logs/3proxy.log
maxretry = ${FAIL2BAN_MAXRETRY:-3}
bantime = ${FAIL2BAN_BANTIME:-1800}
findtime = ${FAIL2BAN_FINDTIME:-600}
action = iptables-multiport[name=3proxy-docker, port="3128,1080", protocol=tcp]
EOF

    echo "  Jail configuration generated with:"
    echo "    maxretry=${FAIL2BAN_MAXRETRY:-3}"
    echo "    bantime=${FAIL2BAN_BANTIME:-1800}"
    echo "    findtime=${FAIL2BAN_FINDTIME:-600}"

    # Test fail2ban configuration
    echo "  Testing fail2ban configuration..."
    fail2ban-client -t || echo "  Warning: fail2ban config test failed, but continuing..."

    # Start fail2ban in foreground
    echo "  Starting fail2ban..."
    fail2ban-client -x start

    # Wait for initialization
    sleep 2

    # Check status
    if fail2ban-client status 3proxy-docker >/dev/null 2>&1; then
        echo "  ✓ fail2ban started successfully (jail: 3proxy-docker)"
        echo "  → Currently banned IPs:"
        fail2ban-client status 3proxy-docker | grep "Banned IP list" || echo "    (none)"
    else
        echo "  ⚠ fail2ban jail '3proxy-docker' is not active"
        echo "  → Available jails:"
        fail2ban-client status || echo "    (none)"
    fi
else
    echo "→ fail2ban disabled (ENABLE_FAIL2BAN != true)"
fi

# ============================================
# Initialize database
# ============================================
echo "→ Initializing database..."
node_modules/.bin/prisma migrate deploy

# ============================================
# Create admin user (checks if exists, creates if not)
# ============================================
echo "→ Ensuring admin user exists..."
node ./dist/scripts/setup.js

# ============================================
# Start main application
# ============================================
echo "→ Starting 3proxy-ui..."
exec node ./dist/scripts/start.js
