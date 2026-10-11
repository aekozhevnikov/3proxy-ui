package users

import (
	"encoding/json"
	"net/http"
	"regexp"

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

func ValidateUsername(u string) bool {
	if len(u) < 1 || len(u) > 64 {
		return false
	}
	return usernamePattern.MatchString(u)
}

// ListHandler — GET /api/admin/users
func ListHandler(w http.ResponseWriter, r *http.Request) {
	var err error // GORM global DB
	rows, err := db.ListProxyUsers()
	if err != nil {
		http.Error(w, "query failed", 500)
		return
	}
	out := make([]ProxyUser, len(rows))
	for i, pu := range rows {
		out[i] = ProxyUser{ID: pu.ID, Username: pu.Username, IsActive: pu.IsActive, DataLimit: pu.DataLimit, IpLimit: pu.IpLimit}
	}
	auth.WriteJSON(w, 200, map[string]interface{}{"users": out})
}

// GetHandler — GET /api/admin/users/[id]
func GetHandler(w http.ResponseWriter, r *http.Request, id int) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(401)
		return
	}
	var err error // GORM global DB
	if err != nil {
		http.Error(w, "db error", 500)
		return
	}
	pu, err := db.GetProxyUserByID(id)
	if err == db.ErrNotFound {
		http.Error(w, "not found", 404)
		return
	}
	if err != nil {
		http.Error(w, "query failed", 500)
		return
	}
	auth.WriteJSON(w, 200, ProxyUser{ID: pu.ID, Username: pu.Username, IsActive: pu.IsActive, DataLimit: pu.DataLimit, IpLimit: pu.IpLimit})
}

// CreateHandler — POST /api/admin/users
func CreateHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(401)
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
		http.Error(w, "bad body", 400)
		return
	}
	if !ValidateUsername(req.Username) {
		http.Error(w, "invalid username", 400)
		return
	}
	var err error // GORM global DB
	if err != nil {
		http.Error(w, "db error", 500)
		return
	}
	u := &db.ProxyUser{Username: req.Username, Password: req.Password, IsActive: req.IsActive, DataLimit: req.DataLimit, IpLimit: req.IpLimit}
	if err := db.CreateProxyUser(u); err != nil {
		http.Error(w, "create failed", 500)
		return
	}
	auth.WriteJSON(w, 201, map[string]interface{}{"success": true})
}

// UpdateHandler — PUT /api/admin/users/[id]
func UpdateHandler(w http.ResponseWriter, r *http.Request, id int) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(401)
		return
	}
	var req struct {
		Username  string `json:"username"`
		IsActive  bool   `json:"isActive"`
		DataLimit *int64 `json:"dataLimit"`
		IpLimit   *int   `json:"ipLimit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "bad body", 400)
		return
	}
	if !ValidateUsername(req.Username) {
		http.Error(w, "invalid username", 400)
		return
	}
	var err error // GORM global DB
	if err != nil {
		http.Error(w, "db error", 500)
		return
	}
	if err := db.UpdateProxyUser(&db.ProxyUser{ID: id, Username: req.Username, IsActive: req.IsActive, DataLimit: req.DataLimit, IpLimit: req.IpLimit}); err == db.ErrNotFound {
		http.Error(w, "not found", 404)
		return
	} else if err != nil {
		http.Error(w, "update failed", 500)
		return
	}
	auth.WriteJSON(w, 200, map[string]interface{}{"success": true})
}

// DeleteHandler — DELETE /api/admin/users/[id]
func DeleteHandler(w http.ResponseWriter, r *http.Request, id int) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(401)
		return
	}
	var err error // GORM global DB
	if err != nil {
		http.Error(w, "db error", 500)
		return
	}
	if err := db.DeleteProxyUser(id); err == db.ErrNotFound {
		http.Error(w, "not found", 404)
		return
	} else if err != nil {
		http.Error(w, "delete failed", 500)
		return
	}
	w.WriteHeader(204)
}
