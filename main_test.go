package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt"
)

func TestAdminRequiresAuth(t *testing.T) {
	// Set JWT_SECRET for testing
	os.Setenv("JWT_SECRET", "test-secret")
	defer os.Unsetenv("JWT_SECRET")

	req := httptest.NewRequest("GET", "/admin/", nil)
	w := httptest.NewRecorder()
	requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})(w, req)
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 without Authorization, got %d", w.Code)
	}
}

func TestAdminWithAuth(t *testing.T) {
	// Set JWT_SECRET for testing
	os.Setenv("JWT_SECRET", "test-secret")
	defer os.Unsetenv("JWT_SECRET")

	// Generate a valid JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId":   1,
		"username": "admin",
		"exp":      time.Now().Add(time.Hour).Unix(),
	})
	tokenString, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}

	req := httptest.NewRequest("GET", "/admin/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)
	w := httptest.NewRecorder()
	requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with Authorization, got %d", w.Code)
	}
}
