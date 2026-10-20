package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Database
	DatabaseURL string

	// JWT
	JWTSecret           string
	SessionCookieSecure bool

	// 3proxy runtime config
	ProxyDomain string
	HTTPPort    string
	SOCKSPort   string

	// File paths
	ProxyAuthPath string
	LogsDir       string
	SyncInfoFile  string

	// Docker
	ProxyContainerName string

	// Telegram
	TelegramBotToken string

	// Server
	ServerPort string
	ServerHost string

	// Maintenance
	MaintenanceInterval time.Duration
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		DatabaseURL:         getEnv("DATABASE_URL", "file:/app/data/app.db"),
		JWTSecret:           getEnv("JWT_SECRET", "dev-secret-key-min-32-characters-long"),
		SessionCookieSecure: getEnvBool("SESSION_COOKIE_SECURE", false),
		ProxyDomain:         getEnv("PROXY_DOMAIN", "localhost"),
		HTTPPort:            getEnv("HTTP_PORT", "3128"),
		SOCKSPort:           getEnv("SOCKS_PORT", "1080"),
		ProxyAuthPath:       getEnv("PROXYAUTH_PATH", "/etc/3proxy/users/.proxyauth"),
		LogsDir:             getEnv("LOGS_DIR", "/var/log/3proxy"),
		SyncInfoFile:        getEnv("SYNC_INFO_FILE", "/var/lib/3proxy-ui/traffic-sync.json"),
		ProxyContainerName:  getEnv("PROXY_CONTAINER_NAME", ""),
		TelegramBotToken:    getEnv("TELEGRAM_BOT_TOKEN", ""),
		ServerPort:          getEnv("SERVER_PORT", "8080"),
		ServerHost:          getEnv("SERVER_HOST", "0.0.0.0"),
		MaintenanceInterval: getEnvDuration("MAINTENANCE_INTERVAL", 60*time.Second),
	}

	// Validate required fields
	if cfg.JWTSecret == "" || len(cfg.JWTSecret) < 32 {
		return nil, ErrInvalidJWTSecret
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		parsed, err := time.ParseDuration(value)
		if err == nil {
			return parsed
		}
	}
	return defaultValue
}

// ErrInvalidJWTSecret is returned when JWT secret is missing or too short
var ErrInvalidJWTSecret = &ConfigError{message: "JWT_SECRET must be at least 32 characters"}

type ConfigError struct {
	message string
}

func (e *ConfigError) Error() string {
	return e.message
}
