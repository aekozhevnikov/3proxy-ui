package users

import (
	"net/http/httptest"
	"testing"
)

func TestValidateUsername(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"admin", true},
		{"user.name_1-2", true},
		{"a:b", false}, // colon rejected (TS parity)
		{"with space", false},
		{"", false},
	}
	for _, c := range cases {
		if got := ValidateUsername(c.in); got != c.want {
			t.Errorf("ValidateUsername(%q) = %v want %v", c.in, got, c.want)
		}
	}
}

func TestRequireAdminBlocks(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/admin/users", nil)
	w := httptest.NewRecorder()
	CreateHandler(w, req)
	if w.Code != 401 {
		t.Errorf("expected 401 unauthorized, got %d", w.Code)
	}
}
