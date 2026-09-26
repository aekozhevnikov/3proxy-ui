FROM node:20.18-alpine AS base
LABEL authors="hungryking"
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/app.db

# ============================================
# Build stage
# ============================================
FROM base AS build
WORKDIR /app

ENV NEXT_BUILD=true
ENV NEXT_TELEMETRY_DISABLED=1

ENV PROXY_DOMAIN=localhost \
    HTTP_PORT=3128 \
    SOCKS_PORT=1080 \
    JWT_SECRET=please-change-this-secret-in-production-at-least-32-chars

# Build tools must be present before npm ci: a package with no prebuild for the
# target platform falls back to node-gyp and compiles from source.
RUN apk add --no-cache python3 make g++ sqlite-dev

COPY package-lock.json package.json ./
RUN npm ci

COPY . ./

# Combined build stage: prisma, compile, build, prune, cleanup
# All in one RUN to reduce layer count and improve compression
RUN npx prisma generate \
    && npm run compile \
    && npm run build:docker \
    && npm prune --production --no-optional \
    && rm -rf /app/node_modules/@prisma/client/scripts \
    /app/node_modules/typescript \
    /app/node_modules/@types \
    /app/node_modules/eslint \
    /app/node_modules/jest \
    /app/node_modules/playwright \
    /app/node_modules/puppeteer \
    /app/node_modules/tsx \
    /app/node_modules/vite \
    /app/node_modules/tsc-alias \
    /app/node_modules/.cache \
    && find /app/node_modules/.bin -type f ! -name "prisma" -delete 2>/dev/null || true \
    && find /app/node_modules/.bin -type l ! -name "prisma" -delete 2>/dev/null || true \
    && find /app/node_modules -name "*.md" -type f -delete 2>/dev/null || true \
    && find /app/node_modules -name "*.test.*" -delete 2>/dev/null || true \
    && find /app/node_modules -name "*.spec.*" -delete 2>/dev/null || true \
    && find /app/node_modules -name "LICENSE*" -type f -delete 2>/dev/null || true \
    && find /app/node_modules -name "CHANGELOG*" -type f -delete 2>/dev/null || true \
    && find /app/node_modules -name "README*" -type f -delete 2>/dev/null || true \
    && find /app/node_modules -name "AUTHORS*" -type f -delete 2>/dev/null || true \
    && find /app/node_modules -name "HISTORY*" -type f -delete 2>/dev/null || true \
    && find /app/node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true \
    && find /app/node_modules -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true \
    && find /app/node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true \
    && find /app/node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true \
    && find /app/node_modules -type d -name "typings" -exec rm -rf {} + 2>/dev/null || true \
    && find /app/node_modules -name "*.d.ts" -delete 2>/dev/null || true \
    && find /app/node_modules -name "*.map" -type f -delete 2>/dev/null || true \
    && rm -rf /app/node_modules/next/dist/docs 2>/dev/null || true

# ============================================
# Runtime stage (minimal image)
# ============================================
FROM node:20.18-alpine AS runtime
LABEL authors="hungryking"
WORKDIR /app

# Install only necessary packages for fail2ban and 3proxy-ui
# python3 is required by fail2ban
RUN apk add --no-cache \
    curl \
    docker-cli \
    fail2ban \
    iptables \
    python3 \
    sqlite-libs

# Copy standalone app, public assets, dist scripts, prisma, package.json
COPY --from=build /app/.next/standalone ./.next/standalone
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build /app/prisma/migrations ./prisma/migrations
COPY --from=build /app/package.json ./package.json

# Copy production node_modules (already pruned and cleaned in build stage)
COPY --from=build /app/node_modules ./node_modules

# Copy fail2ban filter configuration
COPY --from=build /app/3proxy/fail2ban/3proxy-docker.conf /etc/fail2ban/filter.d/3proxy-docker.conf

# Combined runtime setup: directories and fail2ban config
RUN mkdir /var/lib/fail2ban /app/data \
    && rm -f /etc/fail2ban/jail.d/alpine-ssh.conf || true \
    && cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local \
    && rm -f /etc/fail2ban/jail.d/sshd.conf /etc/fail2ban/jail.d/sshd-ddos.conf 2>/dev/null || true \
    && printf '[ssh]\nenabled = false\n\n[sshd]\nenabled = false\n\n[sshd-ddos]\nenabled = false\n' > /etc/fail2ban/jail.d/disable-ssh.conf \
    && sed -i "s/#allowipv6 = auto/allowipv6 = auto/g" /etc/fail2ban/fail2ban.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

VOLUME ["/app/data", "/etc/3proxy", "/var/lib/fail2ban"]

ENV ENABLE_FAIL2BAN=true

ENTRYPOINT ["/entrypoint.sh"]
