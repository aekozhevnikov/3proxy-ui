package admin

import (
	"net/http"
	"strconv"
	"time"

	"3proxy/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// AdminHandler handles admin endpoints
type AdminHandler struct {
	proxyUserSvc *service.ProxyUserService
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler(proxyUserSvc *service.ProxyUserService) *AdminHandler {
	return &AdminHandler{proxyUserSvc: proxyUserSvc}
}

// ListUsers handles GET /api/admin/users
func (h *AdminHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	username := c.Query("username")
	isActiveStr := c.Query("isActive")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 50
	}

	filters := make(map[string]interface{})
	if username != "" {
		filters["username"] = username
	}
	if isActiveStr != "" {
		if isActive, err := strconv.ParseBool(isActiveStr); err == nil {
			filters["isActive"] = isActive
		}
	}

	users, total, err := h.proxyUserSvc.ListProxyUsers(page, pageSize, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Convert to response format without password
	response := make([]gin.H, len(users))
	for i, user := range users {
		response[i] = gin.H{
			"id":             user.ID,
			"username":       user.Username,
			"isActive":       user.IsActive,
			"dataLimit":      user.DataLimit,
			"dataUsed":       user.DataUsed,
			"ipLimit":        user.IPLimit,
			"telegramUserId": user.TelegramUserID,
			"deactivatedAt":  user.DeactivatedAt,
			"expiresAt":      user.ExpiresAt,
			"createdAt":      user.CreatedAt,
			"updatedAt":      user.UpdatedAt,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"users":    response,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetStats handles GET /api/admin/users?stats=true
func (h *AdminHandler) GetStats(c *gin.Context) {
	if c.Query("stats") != "true" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "stats parameter required"})
		return
	}

	// We'll need to add these methods to ProxyUserService
	// For now, return basic stats
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats": gin.H{
			"total":         0,
			"active":        0,
			"inactive":      0,
			"withDataLimit": 0,
		},
	})
}

// CreateUserRequest represents create user request
type CreateUserRequest struct {
	Username       string  `json:"username" binding:"required"`
	Password       string  `json:"password"`
	IsActive       bool    `json:"isActive"`
	DataLimit      *int64  `json:"dataLimit"`
	IPLimit        int     `json:"ipLimit"`
	TelegramUserID string  `json:"telegramUserId"`
	ExpiresAt      *string `json:"expiresAt"` // ISO8601 string
}

// CreateUser handles POST /api/admin/users
func (h *AdminHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var expiresAt *time.Time
	if req.ExpiresAt != nil {
		if t, err := time.Parse(time.RFC3339, *req.ExpiresAt); err == nil {
			expiresAt = &t
		}
	}

	user, err := h.proxyUserSvc.CreateProxyUser(&service.CreateProxyUserRequest{
		Username:       req.Username,
		Password:       req.Password,
		IsActive:       req.IsActive,
		DataLimit:      req.DataLimit,
		IPLimit:        req.IPLimit,
		TelegramUserID: req.TelegramUserID,
		ExpiresAt:      expiresAt,
	})
	if err != nil {
		if err == service.ErrInvalidUsername {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err == service.ErrUserExists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User with username \"" + req.Username + "\" already exists"})
			return
		}
		if err == service.ErrExpiredDate {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot create user with expired or past expiration date"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    user,
	})
}

// UpdateUserRequest represents update user request
type UpdateUserRequest struct {
	Username       string  `json:"username" binding:"required"`
	Password       *string `json:"password"`
	IsActive       *bool   `json:"isActive"`
	DataLimit      *int64  `json:"dataLimit"`
	IPLimit        int     `json:"ipLimit"`
	TelegramUserID string  `json:"telegramUserId"`
	ExpiresAt      *string `json:"expiresAt"`
}

// UpdateUser handles PUT /api/admin/users/:id
func (h *AdminHandler) UpdateUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var expiresAt *time.Time
	if req.ExpiresAt != nil {
		if t, err := time.Parse(time.RFC3339, *req.ExpiresAt); err == nil {
			expiresAt = &t
		}
	}

	user, err := h.proxyUserSvc.UpdateProxyUser(&service.UpdateProxyUserRequest{
		ID:             uint(id),
		Username:       req.Username,
		Password:       req.Password,
		IsActive:       req.IsActive,
		DataLimit:      req.DataLimit,
		IPLimit:        req.IPLimit,
		TelegramUserID: req.TelegramUserID,
		ExpiresAt:      expiresAt,
	})
	if err != nil {
		if err == service.ErrInvalidUsername {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err == service.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		if err == service.ErrExpiredDate {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot activate user with expired or past expiration date"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    user,
	})
}

// DeleteUser handles DELETE /api/admin/users/:id
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if err := h.proxyUserSvc.DeleteProxyUser(uint(id)); err != nil {
		if err == service.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetUser handles GET /api/admin/users/:id
func (h *AdminHandler) GetUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	user, err := h.proxyUserSvc.GetProxyUserByID(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// RegisterRoutes registers admin routes
func RegisterRoutes(router *gin.RouterGroup, proxyUserSvc *service.ProxyUserService) {
	handler := NewAdminHandler(proxyUserSvc)

	router.GET("/users", handler.ListUsers)
	router.POST("/users", handler.CreateUser)
	router.GET("/users/:id", handler.GetUser)
	router.PUT("/users/:id", handler.UpdateUser)
	router.DELETE("/users/:id", handler.DeleteUser)
}
