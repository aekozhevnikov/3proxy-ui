package proxy

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPublicRoutesBypass(t *testing.T) {
	for _, p := range []string{"/login", "/api/auth/session"} {
		req := httptest.NewRequest("GET", p, nil)
		w := httptest.NewRecorder()
		ProxyMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})).ServeHTTP(w, req)
		if w.Code != 200 {
			t.Errorf("public %s should pass, got %d", p, w.Code)
		}
	}
}

func TestAdminRequiresAuth(t *testing.T) {
	req := httptest.NewRequest("GET", "/admin/dashboard", nil)
	w := httptest.NewRecorder()
	ProxyMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {})).ServeHTTP(w, req)
	if w.Code != http.StatusFound {
		t.Errorf("unauth /admin should redirect 302, got %d", w.Code)
	}
}
