package proxy

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/auth"
)

// ProxyMiddleware mirrors src/proxy.ts:
// - Skip /login, /api/auth/*
// - Guard /admin/* with session check (redirect to /login)
// - 3proxy 0.9.5 auth-bypass fix applied (TS task 10 G10 parity)
func ProxyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		// Public routes bypass (TS parity: /login, /api/auth/*)
		if path == "/login" || len(path) >= 9 && path[:9] == "/api/auth" {
			next.ServeHTTP(w, r)
			return
		}
		// Admin routes require session (fail-closed)
		if len(path) >= 6 && path[:6] == "/admin" {
			if !auth.IsAuthorized(r) {
				// Redirect to login (TS parity)
				http.Redirect(w, r, "/login", http.StatusFound)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

// ProxyConfigHandler — GET /api/proxy-config
func ProxyConfigHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	config := map[string]string{
		"domain":   getEnv("PROXY_DOMAIN", "localhost"),
		"httpPort": getEnv("HTTP_PORT", "3128"),
		"socksPort": getEnv("SOCKS_PORT", "1080"),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
