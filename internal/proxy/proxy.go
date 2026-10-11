package proxy

import (
	"net/http"

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
