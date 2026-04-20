FROM node:20.18-alpine AS base
LABEL authors="hungryking"
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=0
ENV DATABASE_URL=file:/app/data/app.db

FROM base AS deps
RUN apk add --no-cache \
    fail2ban \
    iptables \
    bash \
    curl \
    openssl

# ============================================
# Build stage
# ============================================
FROM deps AS build
WORKDIR /app

ENV NEXT_BUILD=true

# Accept build arguments for configuration (can be overridden with docker build --build-arg)
ARG PROXY_DOMAIN=localhost
ARG HTTP_PORT=3128
ARG SOCKS_PORT=1080
ARG JWT_SECRET

ENV PROXY_DOMAIN=${PROXY_DOMAIN} \
    HTTP_PORT=${HTTP_PORT} \
    SOCKS_PORT=${SOCKS_PORT} \
    JWT_SECRET=${JWT_SECRET:-please-change-this-secret-in-production-at-least-32-chars}

COPY package-lock.json package.json ./
RUN npm install

COPY . ./

RUN npx prisma migrate deploy && npx prisma generate

RUN npm run compile && \
    npm run build:docker

# ============================================
# Release stage
# ============================================
FROM deps AS release
WORKDIR /app

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

RUN mkdir -p /etc/3proxy/logs /var/lib/fail2ban

# Disable default Alpine SSH jail
RUN rm -f /etc/fail2ban/jail.d/alpine-ssh.conf || true
RUN cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
RUN sed -i "s/^\[ssh\]$/&\nenabled = false/" /etc/fail2ban/jail.local
RUN sed -i "s/^\[sshd\]$/&\nenabled = false/" /etc/fail2ban/jail.local
RUN sed -i "s/#allowipv6 = auto/allowipv6 = auto/g" /etc/fail2ban/fail2ban.conf

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000 3128 1080

VOLUME ["/app/data", "/etc/3proxy/logs", "/var/lib/fail2ban"]

ENV ENABLE_FAIL2BAN=true

ENTRYPOINT ["/entrypoint.sh"]
