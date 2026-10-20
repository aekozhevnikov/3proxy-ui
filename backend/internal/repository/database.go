package repository

import (
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// GORM models matching Prisma schema

type User struct {
	ID             uint       `gorm:"primaryKey;autoIncrement"`
	Username       string     `gorm:"uniqueIndex;size:64;not null"`
	Password       string     `gorm:"not null"`
	Name           string     `gorm:"size:255"`
	IsAdmin        bool       `gorm:"default:false"`
	SessionVersion int        `gorm:"default:0"`
	CreatedAt      time.Time  `gorm:"autoCreateTime"`
	UpdatedAt      *time.Time `gorm:"autoUpdateTime"`
}

func (User) TableName() string {
	return "User"
}

type Server struct {
	ID                   uint       `gorm:"primaryKey;autoIncrement"`
	Name                 string     `gorm:"not null"`
	HostnameOrIP         string     `gorm:"column:hostname_or_ip;not null"`
	PortForNewAccessKeys int        `gorm:"default:3128"`
	APIUrl               string     `gorm:"column:api_url"`
	APIId                string     `gorm:"column:api_id"`
	APICertSHA256        string     `gorm:"column:api_cert_sha256"`
	APICreatedAt         *time.Time `gorm:"column:api_created_at"`
	IsAvailable          bool       `gorm:"default:true"`
	CreatedAt            time.Time  `gorm:"autoCreateTime"`
	UpdatedAt            *time.Time `gorm:"autoUpdateTime"`
}

func (Server) TableName() string {
	return "Server"
}

type ProxyUser struct {
	ID             uint       `gorm:"primaryKey;autoIncrement"`
	Username       string     `gorm:"uniqueIndex;size:64;not null"`
	Password       string     `gorm:"not null"`
	IsActive       bool       `gorm:"default:true"`
	DataLimit      *int64     `gorm:"column:data_limit"`          // in MB
	DataUsed       int64      `gorm:"default:0;column:data_used"` // in bytes
	IPLimit        int        `gorm:"default:1;column:ip_limit"`
	TelegramUserID string     `gorm:"column:telegram_user_id"`
	DeactivatedAt  *time.Time `gorm:"column:deactivated_at"`
	ExpiresAt      *time.Time `gorm:"column:expires_at"`
	CreatedAt      time.Time  `gorm:"autoCreateTime"`
	UpdatedAt      *time.Time `gorm:"autoUpdateTime"`
}

func (ProxyUser) TableName() string {
	return "ProxyUser"
}

type ConfigVersion struct {
	ID        uint `gorm:"primaryKey;autoIncrement"`
	Version   int  `gorm:"default:1"`
	Config    string
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

func (ConfigVersion) TableName() string {
	return "ConfigVersion"
}

// Database connection
var DB *gorm.DB

// InitDB initializes the database connection and runs auto-migration
func InitDB(databaseURL string) (*gorm.DB, error) {
	// modernc.org/sqlite uses DSN format: file:path?params
	// For in-memory: "file::memory:?cache=shared"

	db, err := gorm.Open(sqlite.Open(databaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// Enable WAL mode, foreign keys, busy timeout
	// Note: these are set via DSN parameters in modernc.org/sqlite
	// But we can also execute them as pragmas
	if _, err := sqlDB.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, err
	}
	if _, err := sqlDB.Exec("PRAGMA foreign_keys=ON"); err != nil {
		return nil, err
	}
	if _, err := sqlDB.Exec("PRAGMA busy_timeout=5000"); err != nil {
		return nil, err
	}

	// Connection pool settings
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)

	// Auto-migrate
	if err := db.AutoMigrate(&User{}, &Server{}, &ProxyUser{}, &ConfigVersion{}); err != nil {
		return nil, err
	}

	DB = db
	return db, nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// Close closes the database connection
func Close() error {
	if DB != nil {
		sqlDB, err := DB.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}

// Transaction executes a function within a database transaction
func Transaction(fn func(*gorm.DB) error) error {
	return DB.Transaction(fn)
}

// WithTransaction provides a helper for executing multiple operations in a transaction
func WithTransaction(fn func(tx *gorm.DB) error) error {
	return DB.Transaction(fn)
}
