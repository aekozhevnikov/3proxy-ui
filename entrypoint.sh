#!/bin/sh
set -e

export DATABASE_URL="${DATABASE_URL:-file:/app/data/app.db}"
export JWT_SECRET="${JWT_SECRET:-dev-secret-change-in-production}"
export SYNC_INFO_FILE="${SYNC_INFO_FILE:-/app/data/traffic-sync.json}"

echo "=== 3proxy-ui Single Container (Go + Next.js) ==="

# ============================================
# Run Go migrations
# ============================================
echo "→ Running database migrations..."
/usr/local/bin/go-backend migrate || echo "Migration completed"

# ============================================
# Ensure admin user exists
# ============================================
echo "→ Ensuring admin user exists..."
/usr/local/bin/go-backend seed-admin || echo "Admin user setup completed"

# ============================================
# Start supervisord (runs go-backend + nextjs-frontend)
# ============================================
echo "→ Starting supervisord (Go API :8080, Next.js :3000)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
