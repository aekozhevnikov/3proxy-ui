package logs

import (
	"net/http"
	"strconv"
)

// BoundedLimit clamps the limit query param (TS task 15 parity)
func BoundedLimit(q string) int {
	n, err := strconv.Atoi(q)
	if err != nil || n < 1 {
		return 1000
	}
	if n > 5000 {
		return 5000
	}
	return n
}

// LogsHandler — GET /api/logs
func LogsHandler(w http.ResponseWriter, r *http.Request) {
	limit := BoundedLimit(r.URL.Query().Get("limit"))
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = limit
	// TODO: integrate with real log file
	w.Write([]byte("{\"logs\":[]}"))
}

// TrafficHandler — GET /api/users/traffic
func TrafficHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("{\"traffic\":{}}"))
}

// SystemStatusHandler — GET /api/system/status
func SystemStatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("{\"status\":\"ok\"}"))
}

// MaintenanceHandler — POST /api/users/maintenance
func MaintenanceHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("{\"status\":\"maintenance completed\"}"))
}
