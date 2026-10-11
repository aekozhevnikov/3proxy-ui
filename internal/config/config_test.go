package config

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandlersRequireAuth(t *testing.T) {
	for name, h := range map[string]http.HandlerFunc{
		"generate": GenerateHandler,
		"reload":   ReloadHandler,
		"status":   StatusHandler,
	} {
		t.Run(name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/config/"+name, nil)
			w := httptest.NewRecorder()
			h(w, req)
			if w.Code != 401 {
				t.Errorf("expected 401, got %d for %s", w.Code, name)
			}
		})
	}
}
