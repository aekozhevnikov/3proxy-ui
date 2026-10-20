package service

import (
	"errors"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"3proxy/backend/internal/config"
	"3proxy/backend/internal/logger"
	"3proxy/backend/internal/repository"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound       = errors.New("user not found")
	ErrRateLimited        = errors.New("too many failed attempts")
)

const (
	// Rate limiter constants
	BaseDelayMs = 250
	MaxDelayMs  = 16000          // 250 * 2^6
	WindowMs    = 15 * 60 * 1000 // 15 minutes
)

// Claims represents JWT claims
type Claims struct {
	UserID         uint   `json:"sub"`
	Username       string `json:"username"`
	IsAdmin        bool   `json:"is_admin"`
	SessionVersion int    `json:"session_version"`
	jwt.RegisteredClaims
}

// AuthService handles authentication logic
type AuthService struct {
	userRepo    repository.UserRepository
	jwtSecret   []byte
	rateLimiter *RateLimiter
	logger      *logger.Logger
}

// RateLimiter implements per-username rate limiting with exponential backoff
type RateLimiter struct {
	mu       sync.Mutex
	attempts map[string]*AttemptRecord
}

type AttemptRecord struct {
	Failures     int
	FirstFailure int64
	LockedUntil  int64
}

// NewAuthService creates a new auth service
func NewAuthService(userRepo repository.UserRepository, cfg *config.Config, log *logger.Logger) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		jwtSecret:   []byte(cfg.JWTSecret),
		rateLimiter: NewRateLimiter(),
		logger:      log,
	}
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		attempts: make(map[string]*AttemptRecord),
	}
}

// Login authenticates a user and returns a JWT token
func (s *AuthService) Login(username, password string) (string, *UserInfo, error) {
	now := time.Now().UnixMilli()

	// Check rate limiting
	if remaining := s.rateLimiter.Check(username, now); remaining > 0 {
		s.logger.Warn("login throttled", map[string]interface{}{
			"username":       username,
			"retry_after_ms": remaining,
		})
		return "", nil, ErrRateLimited
	}

	// Get user from database
	user, err := s.userRepo.GetByUsername(username)
	if err != nil {
		s.rateLimiter.RecordFailure(username, now)
		return "", nil, ErrInvalidCredentials
	}

	if user == nil {
		s.rateLimiter.RecordFailure(username, now)
		s.logger.Warn("login failed for unknown user", map[string]interface{}{"username": username})
		return "", nil, ErrInvalidCredentials
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		s.rateLimiter.RecordFailure(username, now)
		s.logger.Warn("login failed for user", map[string]interface{}{"username": username})
		return "", nil, ErrInvalidCredentials
	}

	// Success - clear rate limit
	s.rateLimiter.Clear(username)

	// Generate JWT token
	token, err := s.GenerateToken(user)
	if err != nil {
		return "", nil, err
	}

	userInfo := &UserInfo{
		ID:       user.ID,
		Username: user.Username,
		Name:     user.Name,
		IsAdmin:  user.IsAdmin,
	}

	s.logger.Info("user signed in", map[string]interface{}{"username": user.Username})
	return token, userInfo, nil
}

// GenerateToken creates a JWT token for a user
func (s *AuthService) GenerateToken(user *repository.User) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:         user.ID,
		Username:       user.Username,
		IsAdmin:        user.IsAdmin,
		SessionVersion: user.SessionVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Audience:  jwt.ClaimStrings{"3proxy-ui"},
			Issuer:    "3proxy-ui",
			Subject:   string(rune(user.ID)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ValidateToken validates a JWT token and checks session version against database
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	}, jwt.WithAudience("3proxy-ui"), jwt.WithIssuer("3proxy-ui"))

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	// Verify session version against database
	user, err := s.userRepo.GetByID(claims.UserID)
	if err != nil || user == nil {
		return nil, ErrUserNotFound
	}

	if user.SessionVersion != claims.SessionVersion {
		return nil, errors.New("session invalidated")
	}

	return claims, nil
}

// ChangeCredentials updates user credentials and bumps session version
func (s *AuthService) ChangeCredentials(userID uint, username, currentPassword, newPassword string) (*UserInfo, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil || user == nil {
		return nil, ErrUserNotFound
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword)); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Check if username is taken by another user
	if username != user.Username {
		existing, err := s.userRepo.GetByUsername(username)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, errors.New("username already taken")
		}
	}

	// Update user
	user.Username = username
	if newPassword != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		user.Password = string(hashed)
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	// Bump session version to invalidate old tokens
	if err := s.userRepo.BumpSessionVersion(userID); err != nil {
		return nil, err
	}

	// Get updated user
	updatedUser, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	return &UserInfo{
		ID:       updatedUser.ID,
		Username: updatedUser.Username,
		Name:     updatedUser.Name,
		IsAdmin:  updatedUser.IsAdmin,
	}, nil
}

// HashPassword creates a bcrypt hash of a password
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// CheckPasswordHash verifies a password against a bcrypt hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// UserInfo represents user info returned to frontend
type UserInfo struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Name     string `json:"name"`
	IsAdmin  bool   `json:"isAdmin"`
}

// RateLimiter methods

func (rl *RateLimiter) Check(username string, now int64) int64 {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	rl.cleanup(now)

	record := rl.attempts[username]
	if record == nil {
		return 0
	}

	if record.LockedUntil > now {
		return record.LockedUntil - now
	}
	return 0
}

func (rl *RateLimiter) RecordFailure(username string, now int64) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	record := rl.attempts[username]
	if record == nil || now-record.FirstFailure >= WindowMs {
		// New window
		record = &AttemptRecord{
			Failures:     1,
			FirstFailure: now,
		}
	} else {
		// Within window
		record.Failures++
	}

	// Exponential backoff: 250ms, 500ms, 1s, 2s, 4s, 8s, 16s
	delay := BaseDelayMs * (1 << (record.Failures - 1))
	if delay > MaxDelayMs {
		delay = MaxDelayMs
	}

	record.LockedUntil = now + int64(delay)
	rl.attempts[username] = record
}

func (rl *RateLimiter) Clear(username string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.attempts, username)
}

func (rl *RateLimiter) cleanup(now int64) {
	for username, record := range rl.attempts {
		if record.LockedUntil <= now {
			delete(rl.attempts, username)
		}
	}
}
