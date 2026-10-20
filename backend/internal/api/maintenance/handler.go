package maintenance

import (
	"net/http"

	"3proxy/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// MaintenanceHandler handles maintenance endpoints
type MaintenanceHandler struct {
	maintenanceSvc *service.MaintenanceService
}

// NewMaintenanceHandler creates a new maintenance handler
func NewMaintenanceHandler(maintenanceSvc *service.MaintenanceService) *MaintenanceHandler {
	return &MaintenanceHandler{maintenanceSvc: maintenanceSvc}
}

// RunMaintenance handles POST /api/users/maintenance
func (h *MaintenanceHandler) RunMaintenance(c *gin.Context) {
	result, err := h.maintenanceSvc.RunMaintenance()
	if err != nil {
		if err == service.ErrMaintenanceRunning {
			c.JSON(http.StatusConflict, gin.H{
				"success": false,
				"error":   "Maintenance already running",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Maintenance failed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":          true,
		"message":          "Maintenance completed",
		"updatedCount":     result.UpdatedCount,
		"deactivatedCount": result.DeactivatedCount,
		"totalTraffic":     result.TotalTraffic,
		"sourceFile":       result.SourceFile,
	})
}

// RegisterRoutes registers maintenance routes
func RegisterRoutes(router *gin.RouterGroup, maintenanceSvc *service.MaintenanceService) {
	handler := NewMaintenanceHandler(maintenanceSvc)
	router.POST("", handler.RunMaintenance)
}
