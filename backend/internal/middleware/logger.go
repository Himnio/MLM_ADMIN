package middleware

import (
	"net/http"
	"time"

	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestLogger returns a middleware that logs HTTP requests
func RequestLogger(logger *utils.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate request ID if not present
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)

		// Start timer
		start := time.Now()
		path := c.Request.URL.Path

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get client info
		clientIP := c.ClientIP()
		method := c.Request.Method
		userAgent := c.Request.UserAgent()
		statusCode := c.Writer.Status()

		// Log the request
		logger.LogHTTPRequest(method, path, clientIP, userAgent, map[string]interface{}{
			"request_id":  requestID,
			"status_code": statusCode,
			"latency":     latency.String(),
			"user_agent":  userAgent,
		})

		// Log response
		logger.LogHTTPResponse(method, path, statusCode, latency, map[string]interface{}{
			"request_id": requestID,
			"client_ip":  clientIP,
		})

		// Log errors
		if len(c.Errors) > 0 {
			for _, e := range c.Errors {
				logger.Error(e.Err, "Request error", map[string]interface{}{
					"request_id":  requestID,
					"status_code": statusCode,
					"error":       e.Error(),
				})
			}
		}
	}
}

// ResponseTimeMiddleware adds response time header
func ResponseTimeMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		// Calculate and set response time
		latency := time.Since(start)
		c.Writer.Header().Set("X-Response-Time", latency.String())
	}
}

// RequestIDMiddleware generates a unique request ID for each request
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)
		c.Next()
	}
}

// NotFoundHandler handles 404 responses
func NotFoundHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "Endpoint not found",
			"error":   "The requested resource could not be found",
		})
	}
}
