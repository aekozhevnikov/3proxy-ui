#!/bin/sh
set -e

echo "Starting 3proxy-ui..."

# Run migrations
echo "Running database migrations..."
/app/3proxy-ui migrate

# Seed admin user
echo "Seeding admin user..."
/app/3proxy-ui seed-admin

# Create proxyauth file if it doesn't exist
if [ ! -f /etc/3proxy/users/.proxyauth ]; then
    echo "Creating empty proxyauth file..."
    touch /etc/3proxy/users/.proxyauth
fi

# Start 3proxy in background
echo "Starting 3proxy..."
3proxy /etc/3proxy/3proxy.cfg &

# Start fail2ban if configured
if [ -f /etc/fail2ban/jail.local ]; then
    echo "Starting fail2ban..."
    fail2ban-server -f &
fi

# Start the Go application
echo "Starting 3proxy-ui server on port 8080..."
exec /app/3proxy-ui
