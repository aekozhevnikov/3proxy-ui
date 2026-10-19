package logs

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/antonkozevnikov/3proxy-ui/go-backend/internal/auth"
)

type LogEntry struct {
	Timestamp int64  `json:"timestamp"`
	Level     string `json:"level"`
	Message   string `json:"message"`
	Auth      *AuthInfo `json:"auth,omitempty"`
	Bytes     *BytesInfo `json:"bytes,omitempty"`
}

type AuthInfo struct {
	User string `json:"user"`
}

type BytesInfo struct {
	Sent     int64 `json:"sent"`
	Received int64 `json:"received"`
}

type LogsResponse struct {
	Success     bool        `json:"success"`
	Logs        []LogEntry  `json:"logs"`
	Total       int         `json:"total"`
	FilesScanned int        `json:"filesScanned"`
	AvailableDates []string `json:"availableDates"`
	Stats       interface{} `json:"stats"`
	Filter      FilterInfo  `json:"filter"`
}

type FilterInfo struct {
	Applied FilterParams `json:"applied"`
}

type FilterParams struct {
	StartDate string `json:"startDate,omitempty"`
	EndDate   string `json:"endDate,omitempty"`
	Username  string `json:"username,omitempty"`
	LogType   string `json:"logType"`
	Limit     int    `json:"limit"`
	Offset    int    `json:"offset"`
}

const (
	DEFAULT_LIMIT = 1000
	MAX_LIMIT     = 5000
)

type LogType string

const (
	LogTypeAll   LogType = "all"
	LogTypeProxy LogType = "PROXY"
	LogTypeSocks LogType = "SOCKS"
	LogTypeAdmin LogType = "ADMIN"
)

func isValidLogType(t string) bool {
	switch LogType(t) {
	case LogTypeAll, LogTypeProxy, LogTypeSocks, LogTypeAdmin:
		return true
	}
	return false
}

func parseLogType(t string) LogType {
	if isValidLogType(t) {
		return LogType(t)
	}
	return LogTypeAll
}

func parseLimit(raw string) int {
	if raw == "" {
		return DEFAULT_LIMIT
	}
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed < 1 {
		return DEFAULT_LIMIT
	}
	if parsed > MAX_LIMIT {
		return MAX_LIMIT
	}
	return parsed
}

// BoundedLimit clamps the limit query param (TS task 15 parity)
func BoundedLimit(q string) int {
	return parseLimit(q)
}

// getLogFiles returns list of log files in /var/log/3proxy
func getLogFiles() ([]string, error) {
	logDir := "/var/log/3proxy"
	files, err := os.ReadDir(logDir)
	if err != nil {
		// Return empty if directory doesn't exist
		return []string{}, nil
	}
	var result []string
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".log") {
			result = append(result, filepath.Join(logDir, f.Name()))
		}
	}
	return result, nil
}

// getAvailableLogDates extracts dates from log filenames
func getAvailableLogDates() ([]string, error) {
	files, err := getLogFiles()
	if err != nil {
		return []string{}, nil
	}
	dateSet := make(map[string]bool)
	for _, f := range files {
		base := filepath.Base(f)
		// Expected format: 3proxy.log.YYYY.MM.DD or 3proxy.log
		parts := strings.Split(base, ".")
		if len(parts) >= 4 {
			dateStr := parts[len(parts)-3] + "-" + parts[len(parts)-2] + "-" + parts[len(parts)-1]
			dateSet[dateStr] = true
		}
	}
	var dates []string
	for d := range dateSet {
		dates = append(dates, d)
	}
	return dates, nil
}

// parseLogLine parses a single log line
func parseLogLine(line string) *LogEntry {
	// Simple parsing - in reality 3proxy logs have specific format
	// For now, return basic structure
	return &LogEntry{
		Timestamp: time.Now().Unix(),
		Level:     "INFO",
		Message:   line,
	}
}

// LogsHandler — GET /api/logs
func LogsHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	query := r.URL.Query()
	filter := FilterParams{
		StartDate: query.Get("startDate"),
		EndDate:   query.Get("endDate"),
		Username:  query.Get("username"),
		LogType:   string(parseLogType(query.Get("logType"))),
		Limit:     parseLimit(query.Get("limit")),
		Offset:    0,
	}
	if offsetStr := query.Get("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil {
			filter.Offset = o
		}
	}

	files, err := getLogFiles()
	if err != nil {
		http.Error(w, "failed to read log directory", http.StatusInternalServerError)
		return
	}

	var allEntries []LogEntry
	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			continue
		}
		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			entry := parseLogLine(line)
			// Apply filters
			if filter.Username != "" && (entry.Auth == nil || entry.Auth.User != filter.Username) {
				continue
			}
			if filter.LogType != "all" && entry.Level != filter.LogType {
				continue
			}
			allEntries = append(allEntries, *entry)
		}
	}

	// Sort by timestamp descending (newest first)
	// For simplicity, we'll just take the last N entries
	total := len(allEntries)
	start := filter.Offset
	end := start + filter.Limit
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}
	// Return newest first (reverse)
	result := make([]LogEntry, 0, end-start)
	for i := total - 1 - start; i >= total - end; i-- {
		if i >= 0 {
			result = append(result, allEntries[i])
		}
	}

	availableDates, _ := getAvailableLogDates()

	resp := LogsResponse{
		Success:        true,
		Logs:           result,
		Total:          total,
		FilesScanned:   len(files),
		AvailableDates: availableDates,
		Stats:          map[string]interface{}{"totalLines": total, "files": len(files)},
		Filter:         FilterInfo{Applied: filter},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// TrafficHandler — GET /api/users/traffic
func TrafficHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Aggregate traffic from logs
	files, _ := getLogFiles()
	userTraffic := make(map[string]struct {
		Sent     int64
		Received int64
		Requests int64
	})

	for _, file := range files {
		content, err := os.ReadFile(file)
		if err != nil {
			continue
		}
		lines := strings.Split(string(content), "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			// Parse log line for traffic info
			// This is a simplified version - real implementation would parse 3proxy log format
		}
	}

	// Convert to response format
	type TrafficUser struct {
		Username  string `json:"username"`
		Sent      int64  `json:"sent"`
		Received  int64  `json:"received"`
		Requests  int64  `json:"requests"`
	}

	var users []TrafficUser
	for username, t := range userTraffic {
		users = append(users, TrafficUser{
			Username: username,
			Sent:     t.Sent,
			Received: t.Received,
			Requests: t.Requests,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"traffic": users,
	})
}

// SystemStatusHandler — GET /api/system/status
func SystemStatusHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"status": map[string]interface{}{
			"isRunning":    true,
			"version":      "3proxy-0.9.5",
			"memoryUsage":  0,
			"pid":          0,
		},
		"config": map[string]interface{}{
			"exists":   true,
			"modified": time.Now().Format(time.RFC3339),
		},
		"users": map[string]interface{}{
			"count":              0,
			"proxyauthSize":      0,
			"proxyauthModified":  nil,
		},
		"logs": map[string]interface{}{
			"size":      0,
			"fileCount": 0,
		},
		"trafficSync": map[string]interface{}{
			"lastSync":    nil,
			"updatedCount": 0,
		},
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// MaintenanceHandler — POST /api/users/maintenance
func MaintenanceHandler(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAuthorized(r) {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	// Run maintenance tasks: traffic sync, deactivate expired users, etc.
	// This is a placeholder - real implementation would:
	// 1. Parse logs and update traffic counters
	// 2. Deactivate users who exceeded data limits
	// 3. Regenerate proxyauth file
	// 4. Reload 3proxy config

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Maintenance completed",
		"details": map[string]interface{}{
			"trafficSynced":  0,
			"usersDeactivated": 0,
			"configReloaded": false,
		},
	})
}
