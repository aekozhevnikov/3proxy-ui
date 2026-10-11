package db

import (
	"os"
	"testing"
)

func TestConnect(t *testing.T) {
	// Use a temporary database file for testing
	testDB := "/tmp/test_3proxy_ui.db"
	os.Remove(testDB)
	defer os.Remove(testDB)

	os.Setenv("DATABASE_URL", testDB)
	defer os.Unsetenv("DATABASE_URL")

	conn, err := Connect()
	if err != nil {
		t.Fatalf("Connect failed: %v", err)
	}
	if conn == nil {
		t.Fatal("conn should not be nil")
	}

	// Run migrations
	migrationSQL, err := os.ReadFile("/Users/antonkozevnikov/development/TypeScript/3proxy-ui/migrations/001_init.sql")
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}
	_, err = conn.Exec(string(migrationSQL))
	if err != nil {
		t.Fatalf("exec migration: %v", err)
	}

	if err := conn.Ping(); err != nil {
		t.Fatalf("Ping failed: %v", err)
	}
	conn.Close()
}

func TestNotFound(t *testing.T) {
	if ErrNotFound == nil {
		t.Error("must be defined")
	}
}
