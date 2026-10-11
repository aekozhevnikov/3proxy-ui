package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/auth"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/config"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/db"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/logs"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/proxy"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/users"
)

func requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Public routes bypass
		if r.URL.Path == "/login" || r.URL.Path == "/api/auth/login" || r.URL.Path == "/api/auth/logout" {
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
		next(w, r)
	}
}

func runMigrate() error {
	log.Println("Running database migrations...")
	err := db.Init()
	if err != nil {
		return fmt.Errorf("db connect: %w", err)
	}

	migrationSQL, err := os.ReadFile("migrations/001_init.sql")
	if err != nil {
		return fmt.Errorf("read migration: %w", err)
	}

	err = db.DB.Exec(string(migrationSQL)).Error
	if err != nil {
		return fmt.Errorf("exec migration: %w", err)
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
	// Password will be hashed by the application on first login
	admin := &db.User{
		Username:       "admin",
		Password:       "admin", // Will be re-hashed on first login via bcrypt
		IsAdmin:        true,
		SessionVersion: 0,
	}

	// We need to insert manually since we don't have CreateUser in db package
	const q = `INSERT INTO "User" (username, password, isAdmin, sessionVersion) VALUES (?, ?, ?, ?)`
	err = db.DB.Exec(q, admin.Username, admin.Password, admin.IsAdmin, admin.SessionVersion).Error
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
	http.HandleFunc("/api/auth/session", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"isAuthorized": auth.IsAuthorized(r), "userId": "admin"})
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Admin users CRUD
	http.HandleFunc("/api/admin/users", func(w http.ResponseWriter, r *http.Request) {
		requireAdmin(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case "GET":
				users.ListHandler(w, r)
			case "POST":
				users.CreateHandler(w, r)
			default:
				w.WriteHeader(http.StatusMethodNotAllowed)
			}
		})(w, r)
	})

	http.HandleFunc("/api/admin/users/", func(w http.ResponseWriter, r *http.Request) {
		requireAdmin(func(w http.ResponseWriter, r *http.Request) {
			// Parse ID from path
			// For simplicity, let's just route to users package
			// Actual ID parsing would need more sophisticated routing
			if r.Method == "GET" {
				users.ListHandler(w, r)
			} else {
				w.WriteHeader(http.StatusNotImplemented)
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

	// Proxy middleware
	handler := proxy.ProxyMiddleware(http.DefaultServeMux)

	log.Println("Starting 3proxy-ui Go backend on :8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
