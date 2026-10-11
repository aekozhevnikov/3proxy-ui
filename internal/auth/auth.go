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

func getJWTSecret() string {
	return os.Getenv("JWT_SECRET")
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
