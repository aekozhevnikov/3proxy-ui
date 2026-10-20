package auth

import (
	"net/http"

	"3proxy/backend/internal/repository"
	"3proxy/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authSvc *service.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authSvc *service.AuthService) *AuthHandler {
	return &AuthHandler{authSvc: authSvc}
}

// LoginRequest represents login request body
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// ChangeCredentialsRequest represents change credentials request
type ChangeCredentialsRequest struct {
	Username        string `json:"username" binding:"required"`
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword"`
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}

	token, userInfo, err := h.authSvc.Login(req.Username, req.Password)
	if err != nil {
		if err == service.ErrRateLimited {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many failed attempts. Try again later."})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Set session cookie
	c.SetCookie("session", token, 3600, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"id":       userInfo.ID,
			"username": userInfo.Username,
			"name":     userInfo.Name,
			"isAdmin":  userInfo.IsAdmin,
		},
	})
}

// Session handles GET /api/auth/session
func (h *AuthHandler) Session(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusOK, gin.H{"isAuthorized": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"isAuthorized": true,
		"userId":       userID,
		"username":     c.GetString("username"),
	})
}

// Logout handles POST /api/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetCookie("session", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ChangeCredentials handles POST /api/auth/change-credentials
func (h *AuthHandler) ChangeCredentials(c *gin.Context) {
	var req ChangeCredentialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and current password are required"})
		return
	}

	userID := c.GetUint("userID")
	userInfo, err := h.authSvc.ChangeCredentials(userID, req.Username, req.CurrentPassword, req.NewPassword)
	if err != nil {
		if err == service.ErrInvalidCredentials {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
			return
		}
		if err.Error() == "username already taken" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username is already taken"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// Generate new token
	token, err := h.authSvc.GenerateToken(&repository.User{
		ID:             userInfo.ID,
		Username:       userInfo.Username,
		Name:           userInfo.Name,
		IsAdmin:        userInfo.IsAdmin,
		SessionVersion: c.GetInt("sessionVersion"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Set new session cookie
	c.SetCookie("session", token, 3600, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated successfully",
		"user": gin.H{
			"id":       userInfo.ID,
			"username": userInfo.Username,
			"name":     userInfo.Name,
			"isAdmin":  userInfo.IsAdmin,
		},
	})
}

// RegisterRoutes registers auth routes
func RegisterRoutes(router *gin.RouterGroup, authSvc *service.AuthService) {
	handler := NewAuthHandler(authSvc)

	router.POST("/login", handler.Login)
	router.GET("/session", handler.Session)
	router.POST("/logout", handler.Logout)
	router.POST("/change-credentials", handler.ChangeCredentials)
}
