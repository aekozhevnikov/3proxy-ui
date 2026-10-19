package db

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB
var ErrNotFound = errors.New("record not found")

func Init() error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Use absolute path for database
		dbPath := filepath.Join(getDataDir(), "3proxy.db")
		dsn = fmt.Sprintf("file:%s?mode=rwc&_cache=shared&_journal_mode=WAL", dbPath)
	}
	var err error
	DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}
	return DB.AutoMigrate(&User{}, &Server{}, &ProxyUser{}, &ConfigVersion{})
}

func getDataDir() string {
	// Check for DATA_DIR env var first
	if dir := os.Getenv("DATA_DIR"); dir != "" {
		return dir
	}
	// Default to ./data in current working directory
	dir := "data"
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "."
	}
	return dir
}

type User struct {
	ID             int    `gorm:"primaryKey;table:User"`
	Username       string `gorm:"uniqueIndex;not null"`
	Password       string `gorm:"not null"`
	Name           *string
	IsAdmin        bool
	SessionVersion int
	CreatedAt      time.Time
	UpdatedAt      *time.Time
}

func (User) TableName() string {
	return "User"
}

type Server struct {
	ID                   int `gorm:"primaryKey"`
	Name                 string
	HostnameOrIp         string
	PortForNewAccessKeys int
	ApiURL               *string
	ApiID                *string
	ApiCertSha256        *string
	ApiCreatedAt         *time.Time
	IsAvailable          bool
	CreatedAt            time.Time
	UpdatedAt            *time.Time
}

type ProxyUser struct {
	ID             int    `gorm:"primaryKey"`
	Username       string `gorm:"uniqueIndex;not null"`
	Password       string `gorm:"not null"`
	IsActive       bool
	DataLimit      *int64
	DataUsed       int64
	IpLimit        *int
	TelegramUserId *string
	DeactivatedAt  *time.Time
	ExpiresAt      *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type ConfigVersion struct {
	ID        int `gorm:"primaryKey"`
	Version   int
	Config    *string
	UpdatedAt time.Time
}

func GetUserByUsername(username string) (*User, error) {
	var u User
	if err := DB.Where("username = ?", username).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func UpdateUserPassword(id int, password string, sv int) error {
	return DB.Model(&User{}).Where("id = ?", id).Updates(map[string]interface{}{"password": password, "sessionVersion": sv + 1}).Error
}

func ListProxyUsers() ([]ProxyUser, error) {
	var out []ProxyUser
	if err := DB.Find(&out).Error; err != nil {
		return nil, err
	}
	return out, nil
}

func CreateProxyUser(u *ProxyUser) error {
	return DB.Create(u).Error
}

func UpdateProxyUser(u *ProxyUser) error {
	return DB.Model(u).Select("username", "isActive", "dataLimit", "ipLimit", "telegramUserId", "deactivatedAt", "expiresAt").Updates(u).Error
}

func DeleteProxyUser(id int) error {
	return DB.Model(&ProxyUser{}).Where("id = ?", id).Update("isActive", false).Error
}

func GetProxyUserByID(id int) (*ProxyUser, error) {
	var u ProxyUser
	if err := DB.First(&u, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}
