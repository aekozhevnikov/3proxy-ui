package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/auth"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/config"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/db"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/logs"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/proxy"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/users"
	"github.com/golang-jwt/jwt"
)

//go:embed internal/web/dist
var embeddedDist embed.FS

// Use auth package's getJWTSecret for consistency
var getJWTSecret = auth.GetJWTSecret

func requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Public routes bypass
		if r.URL.Path == "/login" || r.URL.Path == "/api/auth/login" || r.URL.Path == "/api/auth/logout" || r.URL.Path == "/api/auth/change-credentials" || r.URL.Path == "/api/auth/session" {
			next(w, r)
			return
		}
		// Admin routes require auth
		if len(r.URL.Path) >= 6 && r.URL.Path[:6] == "/admin" {
			if !auth.IsAuthorized(r) {
				w.WriteHeader(http.StatusForbidden)
				return
			}
		}
		// API routes require auth (except health and proxy-config)
		if strings.HasPrefix(r.URL.Path, "/api/") && r.URL.Path != "/api/health" && r.URL.Path != "/api/proxy-config" {
			if !auth.IsAuthorized(r) {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
		}
		next(w, r)
	}
}

func generateJWT(user *db.User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId":         user.ID,
		"username":       user.Username,
		"sessionVersion": user.SessionVersion,
	})
	return token.SignedString([]byte(getJWTSecret()))
}

func runMigrate() error {
	log.Println("Running database migrations...")
	err := db.Init()
	if err != nil {
		return fmt.Errorf("db connect: %w", err)
	}
	log.Println("Migrations applied successfully")
	return nil
}

func seedAdmin() error {
	log.Println("Seeding admin user...")
	err := db.Init()
	if err != nil {
		return fmt.Errorf("db connect: %w", err)
	}

	// Check if admin user already exists
	_, err = db.GetUserByUsername("admin")
	if err == nil {
		log.Println("Admin user already exists")
		return nil
	}
	if err != db.ErrNotFound {
		return fmt.Errorf("check admin: %w", err)
	}

	// Create admin user with default password "admin"
	admin := &db.User{
		Username:       "admin",
		Password:       "admin", // Will be re-hashed on first login via bcrypt
		IsAdmin:        true,
		SessionVersion: 0,
	}

	err = db.DB.Create(admin).Error
	if err != nil {
		return fmt.Errorf("create admin: %w", err)
	}

	log.Println("Admin user created: admin/admin (change password on first login)")
	return nil
}

func main() {
	// Subcommands
	migrateCmd := flag.NewFlagSet("migrate", flag.ExitOnError)
	seedCmd := flag.NewFlagSet("seed-admin", flag.ExitOnError)

	if len(os.Args) < 2 {
		// Default: run HTTP server
		runServer()
		return
	}

	switch os.Args[1] {
	case "migrate":
		migrateCmd.Parse(os.Args[2:])
		if err := runMigrate(); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
	case "seed-admin":
		seedCmd.Parse(os.Args[2:])
		if err := seedAdmin(); err != nil {
			log.Fatalf("Seed admin failed: %v", err)
		}
	default:
		log.Fatalf("Unknown command: %s", os.Args[1])
	}
}

func runServer() {
	if err := db.Init(); err != nil {
		log.Fatal(err)
	}

	// API routes
	http.HandleFunc("/api/auth/session", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"isAuthorized": auth.IsAuthorized(r), "userId": "admin"})
	})

	http.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		user, err := db.GetUserByUsername(req.Username)
		if err == db.ErrNotFound {
			auth.WriteJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
			return
		}
		if err != nil {
			auth.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
			return
		}

		// Simple password check (in production use bcrypt)
		if user.Password != req.Password {
			auth.RecordFailure(req.Username)
			auth.WriteJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
			return
		}

		auth.ClearFailures(req.Username)

		// Generate JWT token
		tokenString, err := generateJWT(user)
		if err != nil {
			auth.WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "token generation failed"})
			return
		}

		// Set cookie
		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    tokenString,
			Path:     "/",
			HttpOnly: true,
			Secure:   false, // Set to true in production with HTTPS
			SameSite: http.SameSiteLaxMode,
			MaxAge:   3600,
		})

		auth.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"success":   true,
			"userId":    user.ID,
			"username":  user.Username,
		})
	})

	http.HandleFunc("/api/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		http.SetCookie(w, &http.Cookie{
			Name:     "session",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   -1,
		})
		auth.WriteJSON(w, http.StatusOK, map[string]string{"success": "logged out"})
	})

	http.HandleFunc("/api/auth/change-credentials", auth.ChangeCredentialsHandler)

	http.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Admin users CRUD
	http.HandleFunc("/api/admin/users", func(w http.ResponseWriter, r *http.Request) {
		requireAdmin(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				users.ListHandler(w, r)
			case http.MethodPost:
				users.CreateHandler(w, r)
			default:
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
		})(w, r)
	})

	http.HandleFunc("/api/admin/users/", func(w http.ResponseWriter, r *http.Request) {
		requireAdmin(func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path
			// Check for /share suffix
			if strings.HasSuffix(path, "/share") && r.Method == http.MethodPost {
				users.ShareHandler(w, r)
				return
			}

			// Parse ID from path
			idStr := strings.TrimPrefix(path, "/api/admin/users/")
			idStr = strings.TrimSuffix(idStr, "/")

			switch r.Method {
			case http.MethodGet:
				users.GetHandler(w, r)
			case http.MethodPut:
				users.UpdateHandler(w, r)
			case http.MethodDelete:
				users.DeleteHandler(w, r)
			default:
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
		})(w, r)
	})

	// Config routes
	http.HandleFunc("/api/config/generate", requireAdmin(config.GenerateHandler))
	http.HandleFunc("/api/config/reload", requireAdmin(config.ReloadHandler))
	http.HandleFunc("/api/config/status", requireAdmin(config.StatusHandler))

	// Logs / traffic / system
	http.HandleFunc("/api/logs", requireAdmin(logs.LogsHandler))
	http.HandleFunc("/api/users/traffic", requireAdmin(logs.TrafficHandler))
	http.HandleFunc("/api/system/status", requireAdmin(logs.SystemStatusHandler))
	http.HandleFunc("/api/users/maintenance", requireAdmin(logs.MaintenanceHandler))

	// Proxy config
	http.HandleFunc("/api/proxy-config", proxy.ProxyConfigHandler)

	// Proxy middleware for SPA routes
	handler := proxy.ProxyMiddleware(http.DefaultServeMux)

	// SPA handler for embedded files
	spaHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// API routes are already handled above
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		// Serve embedded static files
		distFS, _ := fs.Sub(embeddedDist, "internal/web/dist")
		fileServer := http.FileServer(http.FS(distFS))

		// Try to serve the requested file
		path := r.URL.Path
		if path == "/" || path == "" {
			path = "/index.html"
		}

		// Check if file exists in embedded FS
		_, err := distFS.Open(strings.TrimPrefix(path, "/"))
		if err != nil {
			// File not found, serve index.html for SPA routing
			indexContent, err := fs.ReadFile(distFS, "index.html")
			if err != nil {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(indexContent)
			return
		}

		// File exists, serve it
		fileServer.ServeHTTP(w, r)
	})

	// Combine API handler with SPA handler
	finalHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// API routes and admin routes go through the main handler (with auth)
		// Public pages: /login, /api/health, /api/proxy-config
		if strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/admin") || r.URL.Path == "/login" {
			handler.ServeHTTP(w, r)
		} else {
			spaHandler.ServeHTTP(w, r)
		}
	})

	log.Println("Starting 3proxy-ui Go backend on :8080")
	log.Fatal(http.ListenAndServe(":8080", finalHandler))
}
