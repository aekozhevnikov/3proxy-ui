package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireAdminBlocksUnauthenticated(t *testing.T) {
	req := httptest.NewRequest("GET", "/admin/", nil)
	w := httptest.NewRecorder()
	RequireAdmin(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})(w, req)
	if w.Code != 401 {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestWriteJSON(t *testing.T) {
	w := httptest.NewRecorder()
	WriteJSON(w, 200, map[string]string{"status": "ok"})
	var out map[string]string
	json.Unmarshal(w.Body.Bytes(), &out)
	if out["status"] != "ok" {
		t.Errorf("expected ok, got %v", out)
	}
}
