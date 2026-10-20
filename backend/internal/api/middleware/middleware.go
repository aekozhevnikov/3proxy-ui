package middleware

import (
	"net/http"
	"time"

	"3proxy/backend/internal/logger"
	"3proxy/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT from session cookie
func AuthMiddleware(authSvc *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		cookie, err := c.Cookie("session")
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		claims, err := authSvc.ValidateToken(cookie)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		// Store claims in context for downstream handlers
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("isAdmin", claims.IsAdmin)
		c.Set("sessionVersion", claims.SessionVersion)

		c.Next()
	}
}

// AdminMiddleware checks if user is admin
func AdminMiddleware(authSvc *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		isAdmin, exists := c.Get("isAdmin")
		if !exists || !isAdmin.(bool) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		c.Next()
	}
}

// CORSMiddleware adds CORS headers
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// LoggerMiddleware provides structured logging for requests
func LoggerMiddleware(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		log.Info("http request", map[string]interface{}{
			"method":   c.Request.Method,
			"path":     path,
			"query":    raw,
			"status":   status,
			"latency":  latency.String(),
			"clientIP": c.ClientIP(),
		})
	}
}

// RecoveryMiddleware recovers from panics
func RecoveryMiddleware(log *logger.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Error("panic recovered", map[string]interface{}{
					"error": err,
					"path":  c.Request.URL.Path,
				})
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			}
		}()
		c.Next()
	}
}
