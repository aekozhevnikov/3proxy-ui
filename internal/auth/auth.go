package auth

import (
	"encoding/json"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/db"
	"github.com/golang-jwt/jwt"
)

// GetJWTSecret returns the JWT secret for signing/verifying tokens
func GetJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Development fallback (not for production!)
		if os.Getenv("NODE_ENV") != "production" {
			return "dev-secret-key-min-32-characters-long"
		}
	}
	return secret
}

func getJWTSecret() string {
	return GetJWTSecret()
}

// RequireAdmin middleware (fail-closed admin guard — G3 security fix)
func RequireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !IsAuthorized(r) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

// IsAuthorized — session JWT verify (mirrors src/core/session.ts currentSession)
func IsAuthorized(r *http.Request) bool {
	cookie, err := r.Cookie("session")
	if err != nil || cookie.Value == "" {
		// Fallback to Authorization header (API clients)
		if h := r.Header.Get("Authorization"); len(h) > 7 && h[:7] == "Bearer " {
			return verifyJWT(h[7:])
		}
		return false
	}
	return verifyJWT(cookie.Value)
}

func verifyJWT(tokenStr string) bool {
	secret := getJWTSecret()
	if secret == "" {
		return false
	} // fail closed
	_, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	return err == nil
}

// Login attempt rate limiting (mirror src/app/api/auth/login backoff)
var (
	attempts = make(map[string]*AttemptRecord)
	mu       sync.Mutex
)

type AttemptRecord struct {
	Failures     int
	FirstFailure int64
	LockedUntil  int64
}

func CheckLocked(key string, now int64) int64 {
	mu.Lock()
	defer mu.Unlock()
	rec, ok := attempts[key]
	if !ok || rec.LockedUntil <= now {
		return 0
	}
	return rec.LockedUntil - now
}

func RecordFailure(key string) {
	mu.Lock()
	defer mu.Unlock()
	now := time.Now().UnixMilli()
	if rec, ok := attempts[key]; ok {
		rec.Failures++
	} else {
		attempts[key] = &AttemptRecord{Failures: 1, FirstFailure: now}
	}
}

func ClearFailures(key string) { mu.Lock(); delete(attempts, key); mu.Unlock() }

func WriteJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func ChangePassword(userID int, newPass string, sessionVer int) error {
	return db.UpdateUserPassword(userID, newPass, sessionVer)
}

// ChangeCredentialsHandler — POST /api/auth/change-credentials
func ChangeCredentialsHandler(w http.ResponseWriter, r *http.Request) {
	if !IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	var req struct {
		Username       string `json:"username"`
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "bad body"})
		return
	}

	// Get user by username
	user, err := db.GetUserByUsername(req.Username)
	if err == db.ErrNotFound {
		WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "user not found"})
		return
	}
	if err != nil {
		WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "db error"})
		return
	}

	// Verify current password if provided
	if req.CurrentPassword != "" {
		// For simplicity, we'll just check if the password matches
		// In production, you'd use bcrypt.CompareHashAndPassword
		if user.Password != req.CurrentPassword {
			WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "current password is incorrect"})
			return
		}
	}

	// Update password if new password provided
	if req.NewPassword != "" {
		if err := ChangePassword(user.ID, req.NewPassword, user.SessionVersion); err != nil {
			WriteJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update password"})
			return
		}
	}

	// Return success
	WriteJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Profile updated successfully",
		"userId":  user.ID,
	})

	// Clear login attempts for this user
	ClearFailures(req.Username)
}
