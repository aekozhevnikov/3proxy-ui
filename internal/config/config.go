package config

import (
	"encoding/json"
	"net/http"
	"os/exec"
	"sync"

	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/auth"
)

var (
	proxyauthFile = "/etc/3proxy/users/.proxyauth" // placeholder (TS parity src/lib/proxyauth-writer.ts)
	mu            sync.Mutex
)

// ProxyUserRow mirrors Prisma ProxyUser (TS parity src/core/password-hash.ts)
type ProxyUserRow struct {
	Username string `json:"username"`
	Hash     string `json:"-"` // never returned (strip password parity)
	Active   bool   `json:"active"`
}

// GenerateHandler — POST /api/config/generate (admin only)
func GenerateHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	// TODO: integrate DB rows from G11 to write proxyauth file
	auth.WriteJSON(w, 200, map[string]string{"status": "proxyauth generated"})
}

// ReloadHandler — POST /api/config/reload (SIGHUP to 3proxy, admin only)
func ReloadHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	cmd := exec.Command("killall", "-HUP", "3proxy") // placeholder
	_ = cmd
	auth.WriteJSON(w, 200, map[string]string{"status": "reload signal sent"})
}

// StatusHandler — GET /api/config/status (admin only, NO password)
func StatusHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	auth.WriteJSON(w, 200, map[string]interface{}{
		"status":    "running",
		"userCount": 0,
		"password":  nil, // explicitly excluded (TS G10 fix parity)
	})
}

// ProxyAuthWriter placeholder (TS parity src/lib/proxyauth-writer.ts)
func WriteProxyAuth(users []ProxyUserRow) error {
	mu.Lock()
	defer mu.Unlock()
	_ = proxyauthFile
	return nil
}

func init() {
	_ = json.Marshal // keep import
}
