# Multi-stage build for 3proxy-ui with embedded frontend

# Stage 1: Frontend builder
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Go builder
FROM golang:1.21-alpine AS go-builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy embedded frontend dist
COPY --from=frontend-builder /app/internal/web/dist ./internal/web/dist

# Copy source code
COPY main.go ./
COPY internal/ ./internal/
COPY migrations/ ./migrations/

# Build the binary
RUN CGO_ENABLED=1 GOOS=linux go build -o 3proxy-ui .

# Stage 3: Final image
FROM alpine:3.19 AS final
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    sqlite-libs \
    tzdata \
    3proxy \
    fail2ban \
    iptables \
    curl

# Create non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -D -u 1000 -G appgroup appuser

# Copy binary from builder
COPY --from=go-builder /app/3proxy-ui .

# Copy 3proxy config
COPY 3proxy/3proxy.cfg /etc/3proxy/3proxy.cfg

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create directories
RUN mkdir -p /etc/3proxy/users /var/log/3proxy /app/data && \
    chown -R appuser:appgroup /etc/3proxy /var/log/3proxy /app/data

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 8080 3128 1080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run entrypoint
ENTRYPOINT ["/entrypoint.sh"]
