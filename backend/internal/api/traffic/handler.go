package traffic

import (
	"net/http"
	"sync"
	"time"

	"3proxy/backend/internal/parser"
	"github.com/gin-gonic/gin"
)

// TrafficHandler handles traffic endpoints
type TrafficHandler struct {
	parserSvc *parser.LogParserService
	cache     *trafficCache
}

// trafficCache provides 30-second caching for traffic data
type trafficCache struct {
	mu      sync.RWMutex
	data    map[string]*parser.TrafficStats
	expires time.Time
}

// NewTrafficHandler creates a new traffic handler
func NewTrafficHandler(parserSvc *parser.LogParserService) *TrafficHandler {
	return &TrafficHandler{
		parserSvc: parserSvc,
		cache: &trafficCache{
			data:    make(map[string]*parser.TrafficStats),
			expires: time.Time{},
		},
	}
}

// GetTraffic handles GET /api/users/traffic
func (h *TrafficHandler) GetTraffic(c *gin.Context) {
	// Check cache
	h.cache.mu.RLock()
	if time.Now().Before(h.cache.expires) && len(h.cache.data) > 0 {
		data := make(map[string]gin.H, len(h.cache.data))
		for k, v := range h.cache.data {
			data[k] = gin.H{
				"requests": v.Requests,
				"sent":     v.BytesSent,
				"received": v.BytesRecv,
			}
		}
		h.cache.mu.RUnlock()
		c.JSON(http.StatusOK, data)
		return
	}
	h.cache.mu.RUnlock()

	// Cache miss - read from logs
	h.cache.mu.Lock()
	defer h.cache.mu.Unlock()

	// Double-check after acquiring write lock
	if time.Now().Before(h.cache.expires) && len(h.cache.data) > 0 {
		data := make(map[string]gin.H, len(h.cache.data))
		for k, v := range h.cache.data {
			data[k] = gin.H{
				"requests": v.Requests,
				"sent":     v.BytesSent,
				"received": v.BytesRecv,
			}
		}
		c.JSON(http.StatusOK, data)
		return
	}

	// Get all log files and parse
	files, err := h.parserSvc.GetLogFiles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read traffic logs"})
		return
	}

	allStats := make(map[string]*parser.TrafficStats)

	for _, file := range files {
		filePath := h.parserSvc.GetLogFilePath(file)
		lines, err := h.parserSvc.ReadLogFile(filePath, 1024*1024) // 1MB max
		if err != nil {
			continue
		}

		statsMap, _ := h.parserSvc.ParseTrafficLogs(lines)
		for k, v := range statsMap {
			if existing, ok := allStats[k]; ok {
				existing.Requests += v.Requests
				existing.BytesSent += v.BytesSent
				existing.BytesRecv += v.BytesRecv
			} else {
				allStats[k] = v
			}
		}
	}

	// Update cache
	h.cache.data = allStats
	h.cache.expires = time.Now().Add(30 * time.Second)

	// Convert to response
	data := make(map[string]gin.H, len(allStats))
	for k, v := range allStats {
		data[k] = gin.H{
			"requests": v.Requests,
			"sent":     v.BytesSent,
			"received": v.BytesRecv,
		}
	}

	c.JSON(http.StatusOK, data)
}

// RegisterRoutes registers traffic routes
func RegisterRoutes(router *gin.RouterGroup, parserSvc *parser.LogParserService) {
	handler := NewTrafficHandler(parserSvc)
	router.GET("", handler.GetTraffic)
}
