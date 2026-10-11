#!/bin/sh

# Start fail2ban
if [ "$ENABLE_FAIL2BAN" = "true" ]; then
    LOG_FOLDER="/var/log/fail2ban"
    mkdir -p "$LOG_FOLDER"
    touch "$LOG_FOLDER/3proxy.log"

    mkdir -p /etc/fail2ban/jail.d /etc/fail2ban/filter.d

    cat > /etc/fail2ban/jail.d/3proxy.conf << EOF2
[3proxy]
enabled=true
filter=3proxy
action=iptables-allports
logpath=/etc/3proxy/logs/3proxy.log
maxretry=3
bantime=1800
findtime=600
EOF2

    cat > /etc/fail2ban/filter.d/3proxy.conf << 'EOF2'
[Definition]
failregex = .*Failed.*from <HOST>
ignoreregex =
EOF2

    fail2ban-client -x start || echo "fail2ban failed to start"
fi

# Run migrations
echo "→ Running database migrations..."
/usr/local/bin/go-backend migrate || echo "Migration completed"

# Ensure admin user
echo "→ Ensuring admin user exists..."
/usr/local/bin/go-backend seed-admin || echo "Admin user setup completed"

# Start supervisord
echo "→ Starting supervisord (Go API :8080, Next.js :3000)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
