package system

import (
	"net/http"

	"3proxy/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// SystemHandler handles system endpoints
type SystemHandler struct {
	systemSvc *service.SystemService
}

// NewSystemHandler creates a new system handler
func NewSystemHandler(systemSvc *service.SystemService) *SystemHandler {
	return &SystemHandler{systemSvc: systemSvc}
}

// GetStatus handles GET /api/system/status
func (h *SystemHandler) GetStatus(c *gin.Context) {
	status, err := h.systemSvc.GetSystemStatus()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to get system status",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"status":      status.Status,
		"config":      status.Config,
		"users":       status.Users,
		"proxy":       status.Proxy,
		"logs":        status.Logs,
		"timestamp":   status.Timestamp,
		"trafficSync": status.TrafficSync,
	})
}

// GetHealth handles GET /api/health
func (h *SystemHandler) GetHealth(c *gin.Context) {
	health := h.systemSvc.GetHealth()
	c.JSON(http.StatusOK, health)
}

// RegisterRoutes registers system routes
func RegisterRoutes(router *gin.RouterGroup, systemSvc *service.SystemService) {
	handler := NewSystemHandler(systemSvc)
	router.GET("/status", handler.GetStatus)
	router.GET("/health", handler.GetHealth)
}
