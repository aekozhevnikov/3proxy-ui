package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"3proxy/backend/internal/api/admin"
	"3proxy/backend/internal/api/auth"
	apiconfig "3proxy/backend/internal/api/config"
	"3proxy/backend/internal/api/logs"
	"3proxy/backend/internal/api/maintenance"
	"3proxy/backend/internal/api/middleware"
	"3proxy/backend/internal/api/system"
	"3proxy/backend/internal/api/traffic"
	"3proxy/backend/internal/config"
	"3proxy/backend/internal/docker"
	"3proxy/backend/internal/logger"
	"3proxy/backend/internal/parser"
	"3proxy/backend/internal/repository"
	"3proxy/backend/internal/scheduler"
	"3proxy/backend/internal/service"
)

func main() {
	var (
		_    = flag.String("config", "", "Path to config file (optional)")
		port = flag.String("port", "", "Server port (overrides config)")
		host = flag.String("host", "", "Server host (overrides config)")
	)
	flag.Parse()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Override from flags
	if *port != "" {
		cfg.ServerPort = *port
	}
	if *host != "" {
		cfg.ServerHost = *host
	}

	// Initialize logger
	logLevel := logger.InfoLevel
	if os.Getenv("LOG_LEVEL") == "debug" {
		logLevel = logger.DebugLevel
	}
	log := logger.New(logLevel)

	log.Info("starting 3proxy backend", map[string]interface{}{
		"version": "1.0.0",
		"port":    cfg.ServerPort,
		"host":    cfg.ServerHost,
	})

	// Initialize database
	_, err = repository.InitDB(cfg.DatabaseURL)
	if err != nil {
		log.Error("failed to initialize database", map[string]interface{}{"error": err.Error()})
		os.Exit(1)
	}
	defer repository.Close()

	// Initialize services
	userRepo := repository.NewUserRepository()
	proxyUserRepo := repository.NewProxyUserRepository()

	authSvc := service.NewAuthService(userRepo, cfg, log)

	dockerSvc, err := docker.NewDockerService(cfg, log)
	if err != nil {
		log.Error("failed to create docker service", map[string]interface{}{"error": err.Error()})
		// Don't exit - docker might not be available in all environments
		dockerSvc = nil
	}

	proxyUserSvc := service.NewProxyUserService(proxyUserRepo, dockerSvc, cfg, log)

	parserSvc := parser.NewLogParserService(cfg.LogsDir, log)
	trafficSyncSvc := parser.NewTrafficSyncService(cfg.SyncInfoFile, log)

	maintenanceSvc := service.NewMaintenanceService(
		proxyUserRepo,
		parserSvc,
		trafficSyncSvc,
		dockerSvc,
		proxyUserSvc,
		cfg,
		log,
	)

	systemSvc := service.NewSystemService(dockerSvc, proxyUserRepo, cfg, log)

	// Initialize scheduler
	maintenanceScheduler := scheduler.NewScheduler(maintenanceSvc, cfg.MaintenanceInterval, log)

	// Setup Gin router
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(middleware.RecoveryMiddleware(log))
	router.Use(middleware.LoggerMiddleware(log))
	router.Use(middleware.CORSMiddleware())

	// Public routes (no auth)
	auth.RegisterRoutes(router.Group("/api/auth"), authSvc)

	// Protected routes (require auth)
	protected := router.Group("/api")
	protected.Use(middleware.AuthMiddleware(authSvc))

	// Admin routes (require admin)
	adminGroup := protected.Group("/admin")
	adminGroup.Use(middleware.AdminMiddleware(authSvc))
	admin.RegisterRoutes(adminGroup, proxyUserSvc)

	// Config routes
	apiconfig.RegisterRoutes(protected.Group("/config"), proxyUserSvc, dockerSvc, cfg)

	// Logs routes
	logs.RegisterRoutes(protected.Group("/logs"), parserSvc)

	// Traffic routes
	traffic.RegisterRoutes(protected.Group("/users/traffic"), parserSvc)

	// System routes
	system.RegisterRoutes(protected.Group("/system"), systemSvc)

	// Maintenance routes
	maintenance.RegisterRoutes(protected.Group("/users/maintenance"), maintenanceSvc)

	// Health check (no auth)
	router.GET("/api/health", func(c *gin.Context) {
		health := systemSvc.GetHealth()
		c.JSON(http.StatusOK, health)
	})

	// Start maintenance scheduler
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	maintenanceScheduler.Start(ctx)

	// Start HTTP server
	addr := fmt.Sprintf("%s:%s", cfg.ServerHost, cfg.ServerPort)
	srv := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	go func() {
		log.Info("starting HTTP server", map[string]interface{}{"addr": addr})
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("server error", map[string]interface{}{"error": err.Error()})
			os.Exit(1)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down server...")

	// Stop scheduler
	maintenanceScheduler.Stop()

	// Graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("server forced to shutdown", map[string]interface{}{"error": err.Error()})
	}

	// Close docker client
	if dockerSvc != nil {
		dockerSvc.Close()
	}

	log.Info("server exited")
}
