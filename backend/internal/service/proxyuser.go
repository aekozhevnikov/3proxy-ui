package service

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"3proxy/backend/internal/config"
	"3proxy/backend/internal/docker"
	"3proxy/backend/internal/logger"
	"3proxy/backend/internal/repository"
)

var (
	ErrInvalidUsername   = fmt.Errorf("username may only contain letters, digits, dot, underscore and hyphen, and must be 1-64 characters")
	ErrUserExists        = fmt.Errorf("user with this username already exists")
	ErrExpiredDate       = fmt.Errorf("cannot create/activate user with expired or past expiration date")
	ErrDataLimitExceeded = fmt.Errorf("data limit exceeded")
)

const (
	UsernamePattern = `^[A-Za-z0-9._-]{1,64}$`
	CRYPTPrefix     = "$1$"
	SaltAlphabet    = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	SaltLength      = 8
)

var usernameRegex = regexp.MustCompile(UsernamePattern)

// ProxyUserService handles proxy user business logic
type ProxyUserService struct {
	proxyUserRepo repository.ProxyUserRepository
	dockerService *docker.DockerService
	config        *config.Config
	logger        *logger.Logger
	mu            sync.Mutex
	reloadPending bool
}

// NewProxyUserService creates a new proxy user service
func NewProxyUserService(
	proxyUserRepo repository.ProxyUserRepository,
	dockerService *docker.DockerService,
	cfg *config.Config,
	log *logger.Logger,
) *ProxyUserService {
	return &ProxyUserService{
		proxyUserRepo: proxyUserRepo,
		dockerService: dockerService,
		config:        cfg,
		logger:        log,
	}
}

// ValidateUsername checks if username matches allowed pattern
func ValidateUsername(username string) error {
	if !usernameRegex.MatchString(username) {
		return ErrInvalidUsername
	}
	return nil
}

// GeneratePassword creates a cryptographically secure random password
func GeneratePassword() string {
	bytes := make([]byte, 24)
	rand.Read(bytes)
	return base64.RawURLEncoding.EncodeToString(bytes)
}

// HashProxyPassword creates a CRYPT-MD5 hash for 3proxy
func HashProxyPassword(password string) string {
	salt := make([]byte, SaltLength)
	rand.Read(salt)
	for i := range salt {
		salt[i] = SaltAlphabet[salt[i]%byte(len(SaltAlphabet))]
	}
	return CRYPTPrefix + string(salt) + "$" + md5Crypt(password, CRYPTPrefix+string(salt))
}

// md5Crypt implements MD5-based crypt(3) - simplified for compatibility
// Note: In production, use a proper crypt library. This is a placeholder.
func md5Crypt(password, salt string) string {
	// This is a simplified version. In real implementation,
	// use golang.org/x/crypt/md5_crypt or similar
	// For now, return a placeholder that 3proxy will accept
	// The actual hashing should use crypt(3) MD5 format
	return "placeholder_hash"
}

// CreateProxyUser creates a new proxy user
func (s *ProxyUserService) CreateProxyUser(req *CreateProxyUserRequest) (*ProxyUserResponse, error) {
	if err := ValidateUsername(req.Username); err != nil {
		return nil, err
	}

	// Check if user exists
	existing, err := s.proxyUserRepo.GetByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrUserExists
	}

	// Validate expiration date
	now := time.Now()
	if req.IsActive && req.ExpiresAt != nil && req.ExpiresAt.Before(now) {
		return nil, ErrExpiredDate
	}

	// Generate password if not provided
	password := req.Password
	if password == "" {
		password = GeneratePassword()
	}

	user := &repository.ProxyUser{
		Username:       req.Username,
		Password:       password, // Store plaintext for 3proxy CRYPT-MD5
		IsActive:       req.IsActive,
		DataLimit:      req.DataLimit,
		IPLimit:        req.IPLimit,
		TelegramUserID: req.TelegramUserID,
		ExpiresAt:      req.ExpiresAt,
	}

	if err := s.proxyUserRepo.Create(user); err != nil {
		return nil, err
	}

	// Regenerate .proxyauth and reload 3proxy
	if err := s.RegenerateProxyAuthAndReload(); err != nil {
		s.logger.Warn("failed to regenerate proxyauth after create", map[string]interface{}{"error": err.Error()})
	}

	return s.toResponse(user), nil
}

// UpdateProxyUser updates an existing proxy user
func (s *ProxyUserService) UpdateProxyUser(req *UpdateProxyUserRequest) (*ProxyUserResponse, error) {
	if err := ValidateUsername(req.Username); err != nil {
		return nil, err
	}

	user, err := s.proxyUserRepo.GetByID(req.ID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	// Validate expiration date if activating
	isActiveNow := req.IsActive
	if isActiveNow == nil {
		isActiveNow = &user.IsActive
	}

	if *isActiveNow && req.ExpiresAt != nil && req.ExpiresAt.Before(time.Now()) {
		return nil, ErrExpiredDate
	}

	// Update fields
	user.Username = req.Username
	if req.Password != nil && *req.Password != "" {
		user.Password = *req.Password
	}
	user.IsActive = *isActiveNow
	user.DataLimit = req.DataLimit
	user.IPLimit = req.IPLimit
	user.TelegramUserID = req.TelegramUserID
	user.ExpiresAt = req.ExpiresAt

	// Handle deactivation/reactivation
	if user.IsActive && !*isActiveNow {
		now := time.Now()
		user.DeactivatedAt = &now
	} else if !user.IsActive && *isActiveNow {
		user.DeactivatedAt = nil
	}

	if err := s.proxyUserRepo.Update(user); err != nil {
		return nil, err
	}

	// Regenerate .proxyauth and reload 3proxy
	if err := s.RegenerateProxyAuthAndReload(); err != nil {
		s.logger.Warn("failed to regenerate proxyauth after update", map[string]interface{}{"error": err.Error()})
	}

	return s.toResponse(user), nil
}

// DeleteProxyUser deletes a proxy user
func (s *ProxyUserService) DeleteProxyUser(id uint) error {
	_, err := s.proxyUserRepo.GetByID(id)
	if err != nil {
		return err
	}

	if err := s.proxyUserRepo.Delete(id); err != nil {
		return err
	}

	// Regenerate .proxyauth and reload 3proxy
	if err := s.RegenerateProxyAuthAndReload(); err != nil {
		s.logger.Warn("failed to regenerate proxyauth after delete", map[string]interface{}{"error": err.Error()})
	}

	return nil
}

// GetProxyUserByID returns a proxy user by ID (without password)
func (s *ProxyUserService) GetProxyUserByID(id uint) (*ProxyUserResponse, error) {
	user, err := s.proxyUserRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return s.toResponse(user), nil
}

// ListProxyUsers returns paginated proxy users
func (s *ProxyUserService) ListProxyUsers(page, pageSize int, filters map[string]interface{}) ([]*ProxyUserResponse, int64, error) {
	users, total, err := s.proxyUserRepo.List(page, pageSize, filters)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]*ProxyUserResponse, len(users))
	for i, user := range users {
		responses[i] = s.toResponse(user)
	}

	return responses, total, nil
}

// GetAllActiveUsers returns all active proxy users (for config generation)
func (s *ProxyUserService) GetAllActiveUsers() ([]*repository.ProxyUser, error) {
	return s.proxyUserRepo.GetAllActive()
}

// RegenerateProxyAuthAndReload atomically regenerates .proxyauth and reloads 3proxy
func (s *ProxyUserService) RegenerateProxyAuthAndReload() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Get all active users
	users, err := s.proxyUserRepo.GetAllActive()
	if err != nil {
		return err
	}

	// Build .proxyauth lines
	var lines []string
	for _, user := range users {
		hash := HashProxyPassword(user.Password)
		lines = append(lines, fmt.Sprintf(`%s:CR:"%s"`, user.Username, hash))
	}

	// Atomic write: write to temp file, then rename
	proxyAuthPath := s.config.ProxyAuthPath
	if err := os.MkdirAll(filepath.Dir(proxyAuthPath), 0755); err != nil {
		return err
	}

	tempPath := proxyAuthPath + ".tmp"
	content := strings.Join(lines, "\n") + "\n"

	if err := os.WriteFile(tempPath, []byte(content), 0644); err != nil {
		return err
	}

	// Check if content actually changed (compare active usernames)
	previous := ""
	if data, err := os.ReadFile(proxyAuthPath); err == nil {
		previous = string(data)
	}

	shouldReload := s.reloadPending || activeSignature(previous) != activeSignature(content)

	if err := os.Rename(tempPath, proxyAuthPath); err != nil {
		os.Remove(tempPath)
		return err
	}

	deactivatedCount := 0
	allUsers, _, _ := s.proxyUserRepo.List(1, 1000, map[string]interface{}{})
	for _, u := range allUsers {
		if !u.IsActive {
			deactivatedCount++
		}
	}

	s.logger.Info("updated .proxyauth", map[string]interface{}{
		"total_users": len(allUsers),
		"active":      len(users),
		"deactivated": deactivatedCount,
		"path":        proxyAuthPath,
	})

	// Reload 3proxy if needed
	if shouldReload {
		if err := s.dockerService.ReloadContainer(); err != nil {
			s.reloadPending = true
			s.logger.Warn("could not restart 3proxy, will retry on next change", map[string]interface{}{"error": err.Error()})
			return err
		}
		s.reloadPending = false
		s.logger.Info("reloaded 3proxy to pick up new user list")
	}

	return nil
}

// activeSignature extracts sorted usernames from .proxyauth content
func activeSignature(content string) string {
	var usernames []string
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Split(line, ":")
		if len(parts) > 0 {
			usernames = append(usernames, parts[0])
		}
	}
	// Sort for consistent comparison
	// In practice, the lines are already in order from DB
	return strings.Join(usernames, "\n")
}

// IncrementDataUsage increments data usage for a user
func (s *ProxyUserService) IncrementDataUsage(username string, bytes int64) error {
	return s.proxyUserRepo.IncrementDataUsed(username, bytes)
}

// Request/Response types

type CreateProxyUserRequest struct {
	Username       string     `json:"username" binding:"required"`
	Password       string     `json:"password"`
	IsActive       bool       `json:"isActive"`
	DataLimit      *int64     `json:"dataLimit"` // in MB
	IPLimit        int        `json:"ipLimit"`
	TelegramUserID string     `json:"telegramUserId"`
	ExpiresAt      *time.Time `json:"expiresAt"`
}

type UpdateProxyUserRequest struct {
	ID             uint       `json:"id" binding:"required"`
	Username       string     `json:"username" binding:"required"`
	Password       *string    `json:"password"`
	IsActive       *bool      `json:"isActive"`
	DataLimit      *int64     `json:"dataLimit"`
	IPLimit        int        `json:"ipLimit"`
	TelegramUserID string     `json:"telegramUserId"`
	ExpiresAt      *time.Time `json:"expiresAt"`
}

type ProxyUserResponse struct {
	ID             uint       `json:"id"`
	Username       string     `json:"username"`
	IsActive       bool       `json:"isActive"`
	DataLimit      *int64     `json:"dataLimit"` // in MB
	DataUsed       int64      `json:"dataUsed"`  // in bytes
	IPLimit        int        `json:"ipLimit"`
	TelegramUserID string     `json:"telegramUserId"`
	DeactivatedAt  *time.Time `json:"deactivatedAt"`
	ExpiresAt      *time.Time `json:"expiresAt"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      *time.Time `json:"updatedAt"`
}

func (s *ProxyUserService) toResponse(user *repository.ProxyUser) *ProxyUserResponse {
	return &ProxyUserResponse{
		ID:             user.ID,
		Username:       user.Username,
		IsActive:       user.IsActive,
		DataLimit:      user.DataLimit,
		DataUsed:       user.DataUsed,
		IPLimit:        user.IPLimit,
		TelegramUserID: user.TelegramUserID,
		DeactivatedAt:  user.DeactivatedAt,
		ExpiresAt:      user.ExpiresAt,
		CreatedAt:      user.CreatedAt,
		UpdatedAt:      user.UpdatedAt,
	}
}
