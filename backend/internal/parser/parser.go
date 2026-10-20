package parser

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"3proxy/backend/internal/logger"
)

// LogEntry represents a parsed 3proxy log entry
type LogEntry struct {
	TimeUnix   int64  `json:"time_unix"`
	ProxyType  string `json:"proxy_type"`
	ProxyPort  int    `json:"proxy_port"`
	ErrorCode  string `json:"error_code"`
	Username   string `json:"username"`
	ClientIP   string `json:"client_ip"`
	ClientPort int    `json:"client_port"`
	ServerIP   string `json:"server_ip"`
	ServerPort int    `json:"server_port"`
	BytesSent  int64  `json:"bytes_sent"`
	BytesRecv  int64  `json:"bytes_received"`
	Hostname   string `json:"hostname"`
	Message    string `json:"message"`
	Raw        string `json:"raw"`
}

// TrafficStats represents aggregated traffic for a user/IP
type TrafficStats struct {
	Username  string
	Requests  int64
	BytesSent int64
	BytesRecv int64
}

// LogFileIdentity identifies a log file by inode
type LogFileIdentity struct {
	Key  string // dev:ino
	Size int64
}

// NewLogContent represents newly read log content
type NewLogContent struct {
	Lines      []string
	NextOffset int64
}

// LogParserService parses 3proxy logs and aggregates traffic
type LogParserService struct {
	logsDir string
	logger  *logger.Logger
}

// NewLogParserService creates a new log parser service
func NewLogParserService(logsDir string, log *logger.Logger) *LogParserService {
	return &LogParserService{
		logsDir: logsDir,
		logger:  log,
	}
}

// parseLogLine parses a single log line (JSON or text format)
func (s *LogParserService) parseLogLine(line string) *LogEntry {
	line = strings.TrimSpace(line)
	if line == "" {
		return nil
	}

	// Try JSON format first (LogFormat JSON)
	var jsonEntry struct {
		TimeUnix int64 `json:"time_unix"`
		Proxy    struct {
			Type string `json:"type"`
			Port int    `json:"port"`
		} `json:"proxy"`
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
		Auth struct {
			User string `json:"user"`
		} `json:"auth"`
		Client struct {
			IP   string `json:"ip"`
			Port int    `json:"port"`
		} `json:"client"`
		Server struct {
			IP   string `json:"ip"`
			Port int    `json:"port"`
		} `json:"server"`
		Bytes struct {
			Sent     int64 `json:"sent"`
			Received int64 `json:"received"`
		} `json:"bytes"`
		Request struct {
			Hostname string `json:"hostname"`
		} `json:"request"`
		Message string `json:"message"`
	}

	if err := json.Unmarshal([]byte(line), &jsonEntry); err == nil {
		// Check if it has required 3proxy JSON fields
		if jsonEntry.Auth.User != "" || jsonEntry.Client.IP != "" {
			return &LogEntry{
				TimeUnix:   jsonEntry.TimeUnix,
				ProxyType:  jsonEntry.Proxy.Type,
				ProxyPort:  jsonEntry.Proxy.Port,
				ErrorCode:  jsonEntry.Error.Code,
				Username:   jsonEntry.Auth.User,
				ClientIP:   jsonEntry.Client.IP,
				ClientPort: jsonEntry.Client.Port,
				ServerIP:   jsonEntry.Server.IP,
				ServerPort: jsonEntry.Server.Port,
				BytesSent:  jsonEntry.Bytes.Sent,
				BytesRecv:  jsonEntry.Bytes.Received,
				Hostname:   jsonEntry.Request.Hostname,
				Message:    jsonEntry.Message,
				Raw:        line,
			}
		}
	}

	// Fall back to text format parsing
	// Format: "IP:PORT - - [timestamp] "METHOD PATH HTTP/VERSION" status bytes_sent bytes_received"
	// Example: "192.168.1.100:8080 - - [24/Mar/2026:12:34:56] "CONNECT google.com:443 HTTP/1.1" 200 1234 5678"

	// Regex for text format
	textRegex := regexp.MustCompile(`^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d+)\s+(\d+)\s+(\d+)`)
	matches := textRegex.FindStringSubmatch(line)
	if matches == nil {
		return nil
	}

	ipPort := matches[1]
	statusCode := matches[4]
	bytesSent, _ := strconv.ParseInt(matches[5], 10, 64)
	bytesRecv, _ := strconv.ParseInt(matches[6], 10, 64)

	// Extract IP without port
	clientIP := ipPort
	if idx := strings.LastIndex(ipPort, ":"); idx != -1 {
		clientIP = ipPort[:idx]
	}

	// Extract hostname from request
	request := matches[3]
	hostname := ""
	if strings.HasPrefix(request, "CONNECT ") {
		// CONNECT example.com:443 HTTP/1.1
		parts := strings.Split(request, " ")
		if len(parts) >= 2 {
			hostPort := parts[1]
			if idx := strings.LastIndex(hostPort, ":"); idx != -1 {
				hostname = hostPort[:idx]
			} else {
				hostname = hostPort
			}
		}
	} else {
		// GET/POST http://example.com/path HTTP/1.1
		hostRegex := regexp.MustCompile(`https?://([^:/]+)`)
		if match := hostRegex.FindStringSubmatch(request); len(match) > 1 {
			hostname = match[1]
		}
	}

	// Parse timestamp (approximate - use current time if parsing fails)
	var timeUnix int64 = time.Now().Unix()
	if ts, err := time.Parse("02/Jan/2006:15:04:05", matches[2]); err == nil {
		timeUnix = ts.Unix()
	}

	return &LogEntry{
		TimeUnix:  timeUnix,
		ProxyType: "PROXY", // Default for text format
		ErrorCode: statusCode,
		Username:  clientIP, // Use IP as username for text format
		ClientIP:  clientIP,
		BytesSent: bytesSent,
		BytesRecv: bytesRecv,
		Hostname:  hostname,
		Message:   line,
		Raw:       line,
	}
}

// AggregateTraffic aggregates traffic from log entries
func (s *LogParserService) AggregateTraffic(entries []*LogEntry) map[string]*TrafficStats {
	statsMap := make(map[string]*TrafficStats)

	for _, entry := range entries {
		key := entry.Username
		if key == "" {
			key = entry.ClientIP
		}
		if key == "" {
			continue
		}

		stats := statsMap[key]
		if stats == nil {
			stats = &TrafficStats{Username: key}
			statsMap[key] = stats
		}

		stats.Requests++
		stats.BytesSent += entry.BytesSent
		stats.BytesRecv += entry.BytesRecv
	}

	return statsMap
}

// ReadNewLogContent reads only new content from a log file since last offset
func (s *LogParserService) ReadNewLogContent(filePath string, lastOffset int64, fileSize int64) (*NewLogContent, error) {
	// File shrank or was rewritten: start from beginning
	offset := lastOffset
	if lastOffset > fileSize {
		offset = 0
	}

	if offset >= fileSize {
		return &NewLogContent{Lines: []string{}, NextOffset: offset}, nil
	}

	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Seek to last offset
	if _, err := file.Seek(offset, 0); err != nil {
		return nil, err
	}

	length := fileSize - offset
	buf := make([]byte, length)
	n, err := file.Read(buf)
	if err != nil && err.Error() != "EOF" {
		return nil, err
	}

	text := string(buf[:n])
	lastNewline := strings.LastIndex(text, "\n")

	if lastNewline == -1 {
		return &NewLogContent{Lines: []string{}, NextOffset: offset}, nil
	}

	complete := text[:lastNewline+1]
	lines := strings.Split(complete, "\n")

	// Filter empty lines
	var filteredLines []string
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			filteredLines = append(filteredLines, line)
		}
	}

	nextOffset := offset + int64(len(complete))

	return &NewLogContent{
		Lines:      filteredLines,
		NextOffset: nextOffset,
	}, nil
}

// IdentifyLogFile returns the identity (dev:ino) and size of a log file
func (s *LogParserService) IdentifyLogFile(filePath string) (*LogFileIdentity, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}

	// Use device and inode as key
	// Note: This works on Linux. On other platforms, we may need a different approach.
	// For simplicity, we use the file path as key if stat doesn't provide dev/ino.
	key := filePath
	if stat, ok := info.Sys().(interface {
		Dev() uint64
		Ino() uint64
	}); ok {
		key = fmt.Sprintf("%d:%d", stat.Dev(), stat.Ino())
	}

	return &LogFileIdentity{
		Key:  key,
		Size: info.Size(),
	}, nil
}

// GetLogFiles returns list of 3proxy log files
func (s *LogParserService) GetLogFiles() ([]string, error) {
	entries, err := os.ReadDir(s.logsDir)
	if err != nil {
		return nil, err
	}

	var files []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if strings.HasPrefix(name, "3proxy.log") || strings.HasSuffix(name, ".log") {
			files = append(files, name)
		}
	}

	// Sort newest first
	for i, j := 0, len(files)-1; i < j; i, j = i+1, j-1 {
		files[i], files[j] = files[j], files[i]
	}

	return files, nil
}

// GetLogFilePath returns full path to a log file
func (s *LogParserService) GetLogFilePath(name string) string {
	return filepath.Join(s.logsDir, name)
}

// ReadLogFile reads entire log file (for stats/debugging)
func (s *LogParserService) ReadLogFile(filePath string, maxBytes int64) ([]string, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, err
	}

	if info.Size() <= maxBytes {
		content, err := os.ReadFile(filePath)
		if err != nil {
			return nil, err
		}
		lines := strings.Split(string(content), "\n")
		var filtered []string
		for _, line := range lines {
			if strings.TrimSpace(line) != "" {
				filtered = append(filtered, line)
			}
		}
		return filtered, nil
	}

	// Read tail
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	offset := info.Size() - maxBytes
	buf := make([]byte, maxBytes)
	_, err = file.ReadAt(buf, offset)
	if err != nil && err.Error() != "EOF" {
		return nil, err
	}

	text := string(buf)
	lastNewline := strings.LastIndex(text, "\n")
	if lastNewline == -1 {
		return []string{}, nil
	}

	complete := text[:lastNewline+1]
	lines := strings.Split(complete, "\n")

	var filtered []string
	for _, line := range lines {
		if strings.TrimSpace(line) != "" {
			filtered = append(filtered, line)
		}
	}

	return filtered, nil
}

// ParseTrafficLogs parses log lines and returns aggregated traffic
func (s *LogParserService) ParseTrafficLogs(lines []string) (map[string]*TrafficStats, int64) {
	var entries []*LogEntry
	for _, line := range lines {
		if entry := s.parseLogLine(line); entry != nil {
			entries = append(entries, entry)
		}
	}

	statsMap := s.AggregateTraffic(entries)

	var totalTraffic int64
	for _, stats := range statsMap {
		totalTraffic += stats.BytesSent + stats.BytesRecv
	}

	return statsMap, totalTraffic
}

// GetAvailableLogDates returns list of available log dates
func (s *LogParserService) GetAvailableLogDates() ([]string, error) {
	files, err := s.GetLogFiles()
	if err != nil {
		return nil, err
	}

	dates := make(map[string]bool)
	for _, file := range files {
		parts := strings.Split(file, ".")
		if len(parts) >= 4 {
			// 3proxy.log.2026.03.24
			date := strings.Join(parts[1:4], "-")
			dates[date] = true
		}
	}

	var result []string
	for date := range dates {
		result = append(result, date)
	}

	// Sort descending
	for i := 0; i < len(result)-1; i++ {
		for j := i + 1; j < len(result); j++ {
			if result[i] < result[j] {
				result[i], result[j] = result[j], result[i]
			}
		}
	}

	return result, nil
}

// FilterLogEntries applies filters to log entries
func (s *LogParserService) FilterLogEntries(entries []*LogEntry, filter LogFilter) []*LogEntry {
	var filtered []*LogEntry
	for _, entry := range entries {
		if s.matchesFilter(entry, filter) {
			filtered = append(filtered, entry)
		}
	}
	return filtered
}

// LogFilter represents log filtering options
type LogFilter struct {
	StartDate string
	EndDate   string
	Username  string
	LogType   string
	Limit     int
	Offset    int
}

func (s *LogParserService) matchesFilter(entry *LogEntry, filter LogFilter) bool {
	if filter.LogType != "" && filter.LogType != "all" && entry.ProxyType != filter.LogType {
		return false
	}

	if filter.Username != "" && entry.Username != filter.Username {
		return false
	}

	if filter.StartDate != "" || filter.EndDate != "" {
		entryDate := time.Unix(entry.TimeUnix, 0).Format("2006-01-02")
		if filter.StartDate != "" && entryDate < filter.StartDate {
			return false
		}
		if filter.EndDate != "" && entryDate > filter.EndDate {
			return false
		}
	}

	return true
}

// GetLogs reads and filters logs with pagination
func (s *LogParserService) GetLogs(filter LogFilter) ([]*LogEntry, int64, int, error) {
	files, err := s.GetLogFiles()
	if err != nil {
		return nil, 0, 0, err
	}

	var allEntries []*LogEntry
	limit := filter.Limit
	if limit <= 0 {
		limit = 1000
	}
	offset := filter.Offset

	for _, file := range files {
		filePath := s.GetLogFilePath(file)
		lines, err := s.ReadLogFile(filePath, 1024*1024) // 1MB max per file
		if err != nil {
			s.logger.Warn("failed to read log file", map[string]interface{}{
				"file":  filePath,
				"error": err.Error(),
			})
			continue
		}

		for i := len(lines) - 1; i >= 0; i-- {
			entry := s.parseLogLine(lines[i])
			if entry == nil {
				continue
			}

			if !s.matchesFilter(entry, filter) {
				continue
			}

			if len(allEntries) < offset {
				continue
			}

			allEntries = append(allEntries, entry)

			if len(allEntries) >= limit {
				break
			}
		}

		if len(allEntries) >= limit {
			break
		}
	}

	total := int64(len(allEntries) + offset)
	return allEntries, total, len(files), nil
}

// GetLogStats returns statistics about log files
func (s *LogParserService) GetLogStats() (totalLogs int64, earliest, latest string, fileCount int, totalSize int64, err error) {
	files, err := s.GetLogFiles()
	if err != nil {
		return
	}

	if len(files) == 0 {
		return
	}

	var dates []string

	for _, file := range files {
		filePath := s.GetLogFilePath(file)
		info, err := os.Stat(filePath)
		if err != nil {
			continue
		}

		totalSize += info.Size()
		fileCount++

		lines, _ := s.ReadLogFile(filePath, 1024*1024)
		totalLogs += int64(len(lines))

		parts := strings.Split(file, ".")
		if len(parts) >= 4 {
			date := strings.Join(parts[1:4], "-")
			dates = append(dates, date)
		}
	}

	if len(dates) > 0 {
		for i := 0; i < len(dates)-1; i++ {
			for j := i + 1; j < len(dates); j++ {
				if dates[i] > dates[j] {
					dates[i], dates[j] = dates[j], dates[i]
				}
			}
		}
		earliest = dates[0]
		latest = dates[len(dates)-1]
	}

	return
}
