package users

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"

	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/auth"
	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/db"
)

var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9._-]{1,64}$`)

type ProxyUser struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	IsActive  bool   `json:"isActive"`
	DataLimit *int64 `json:"dataLimit,omitempty"`
	IpLimit   *int   `json:"ipLimit,omitempty"`
}

type ProxyUserWithPassword struct {
	ProxyUser
	Password string `json:"password"`
}

func ValidateUsername(u string) bool {
	if len(u) < 1 || len(u) > 64 {
		return false
	}
	return usernamePattern.MatchString(u)
}

// ListHandler — GET /api/admin/users
func ListHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Check if stats requested
	if r.URL.Query().Get("stats") == "true" {
		statsHandler(w, r)
		return
	}

	rows, err := db.ListProxyUsers()
	if err != nil {
		http.Error(w, "query failed", http.StatusInternalServerError)
		return
	}
	out := make([]ProxyUser, len(rows))
	for i, pu := range rows {
		out[i] = ProxyUser{ID: pu.ID, Username: pu.Username, IsActive: pu.IsActive, DataLimit: pu.DataLimit, IpLimit: pu.IpLimit}
	}
	auth.WriteJSON(w, http.StatusOK, map[string]interface{}{"success": true, "users": out})
}

// statsHandler returns user statistics
func statsHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.ListProxyUsers()
	if err != nil {
		http.Error(w, "query failed", http.StatusInternalServerError)
		return
	}

	stats := map[string]interface{}{
		"total":          len(rows),
		"active":         0,
		"inactive":       0,
		"withDataLimit":  0,
	}

	for _, pu := range rows {
		if pu.IsActive {
			stats["active"] = stats["active"].(int) + 1
		} else {
			stats["inactive"] = stats["inactive"].(int) + 1
		}
		if pu.DataLimit != nil {
			stats["withDataLimit"] = stats["withDataLimit"].(int) + 1
		}
	}

	auth.WriteJSON(w, http.StatusOK, map[string]interface{}{"success": true, "stats": stats})
}

// GetHandler — GET /api/admin/users/[id]
func GetHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	idStr := r.URL.Path[len("/api/admin/users/"):]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	pu, err := db.GetProxyUserByID(id)
	if err == db.ErrNotFound {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "query failed", http.StatusInternalServerError)
		return
	}

	auth.WriteJSON(w, http.StatusOK, ProxyUser{ID: pu.ID, Username: pu.Username, IsActive: pu.IsActive, DataLimit: pu.DataLimit, IpLimit: pu.IpLimit})
}

// CreateHandler — POST /api/admin/users
func CreateHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	var req struct {
		Username  string `json:"username"`
		Password  string `json:"password"`
		IsActive  bool   `json:"isActive"`
		DataLimit *int64 `json:"dataLimit"`
		IpLimit   *int   `json:"ipLimit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	if !ValidateUsername(req.Username) {
		http.Error(w, "invalid username", http.StatusBadRequest)
		return
	}

	u := &db.ProxyUser{Username: req.Username, Password: req.Password, IsActive: req.IsActive, DataLimit: req.DataLimit, IpLimit: req.IpLimit}
	if err := db.CreateProxyUser(u); err != nil {
		http.Error(w, "create failed", http.StatusInternalServerError)
		return
	}
	auth.WriteJSON(w, http.StatusCreated, map[string]interface{}{"success": true})
}

// UpdateHandler — PUT /api/admin/users/[id]
func UpdateHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	idStr := r.URL.Path[len("/api/admin/users/"):]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Username  string `json:"username"`
		IsActive  bool   `json:"isActive"`
		DataLimit *int64 `json:"dataLimit"`
		IpLimit   *int   `json:"ipLimit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	if !ValidateUsername(req.Username) {
		http.Error(w, "invalid username", http.StatusBadRequest)
		return
	}

	if err := db.UpdateProxyUser(&db.ProxyUser{ID: id, Username: req.Username, IsActive: req.IsActive, DataLimit: req.DataLimit, IpLimit: req.IpLimit}); err == db.ErrNotFound {
		http.Error(w, "not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "update failed", http.StatusInternalServerError)
		return
	}
	auth.WriteJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

// DeleteHandler — DELETE /api/admin/users/[id]
func DeleteHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	idStr := r.URL.Path[len("/api/admin/users/"):]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	if err := db.DeleteProxyUser(id); err == db.ErrNotFound {
		http.Error(w, "not found", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "delete failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ShareHandler — POST /api/admin/users/[id]/share
func ShareHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	idStr := r.URL.Path[len("/api/admin/users/"):]
	idStr = idStr[:len(idStr)-len("/share")]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "invalid user ID", http.StatusBadRequest)
		return
	}

	pu, err := db.GetProxyUserByID(id)
	if err == db.ErrNotFound {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "query failed", http.StatusInternalServerError)
		return
	}

	auth.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"username": pu.Username,
		"password": pu.Password, // Return plaintext for sharing (matches Next.js behavior)
	})
}
