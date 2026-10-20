package config

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"3proxy/backend/internal/config"
	"3proxy/backend/internal/docker"
	"3proxy/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// ConfigHandler handles config endpoints
type ConfigHandler struct {
	proxyUserSvc *service.ProxyUserService
	dockerSvc    *docker.DockerService
	cfg          *config.Config
}

// NewConfigHandler creates a new config handler
func NewConfigHandler(proxyUserSvc *service.ProxyUserService, dockerSvc *docker.DockerService, cfg *config.Config) *ConfigHandler {
	return &ConfigHandler{
		proxyUserSvc: proxyUserSvc,
		dockerSvc:    dockerSvc,
		cfg:          cfg,
	}
}

// GenerateConfig handles GET /api/config/generate
func (h *ConfigHandler) GenerateConfig(c *gin.Context) {
	users, err := h.proxyUserSvc.GetAllActiveUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate config"})
		return
	}

	var configLines []string
	for _, user := range users {
		limits := []string{}
		if user.DataLimit != nil {
			limits = append(limits, strconv.FormatInt(*user.DataLimit, 10)+" MB")
		}
		if user.ExpiresAt != nil {
			limits = append(limits, "expires "+user.ExpiresAt.Format(time.RFC3339))
		}
		if user.IPLimit > 1 {
			limits = append(limits, "max "+strconv.Itoa(user.IPLimit)+" IPs")
		}

		line := user.Username
		if len(limits) > 0 {
			line += " (" + strings.Join(limits, ", ") + ")"
		} else {
			line += " (unlimited)"
		}
		configLines = append(configLines, line)
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"config":      strings.Join(configLines, "\n"),
		"userCount":   len(users),
		"generatedAt": time.Now().Format(time.RFC3339),
	})
}

// ReloadConfig handles POST /api/config/reload
func (h *ConfigHandler) ReloadConfig(c *gin.Context) {
	if err := h.proxyUserSvc.RegenerateProxyAuthAndReload(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to reload configuration",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Configuration reloaded and container restarted",
	})
}

// GetProxyConfig handles GET /api/proxy-config
func (h *ConfigHandler) GetProxyConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"domain":    h.cfg.ProxyDomain,
		"httpPort":  h.cfg.HTTPPort,
		"socksPort": h.cfg.SOCKSPort,
	})
}

// RegisterRoutes registers config routes
func RegisterRoutes(router *gin.RouterGroup, proxyUserSvc *service.ProxyUserService, dockerSvc *docker.DockerService, cfg *config.Config) {
	handler := NewConfigHandler(proxyUserSvc, dockerSvc, cfg)

	router.GET("/generate", handler.GenerateConfig)
	router.POST("/reload", handler.ReloadConfig)
	router.GET("/proxy-config", handler.GetProxyConfig)
}
