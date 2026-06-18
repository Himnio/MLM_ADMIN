package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecureHeaders returns a middleware that sets security headers
func SecureHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Content Security Policy - allow swagger UI assets
		csp := "default-src 'self'; " +
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
			"font-src 'self' data:; " +
			"img-src 'self' data:; " +
			"script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
			"connect-src 'self' http://localhost:8080;"
		c.Writer.Header().Set("Content-Security-Policy", csp)

		// Prevent MIME type sniffing
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		c.Writer.Header().Set("X-Frame-Options", "DENY")

		// XSS Protection
		c.Writer.Header().Set("X-XSS-Protection", "1; mode=block")

		// HSTS (only in production)
		c.Writer.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		// Referrer Policy
		c.Writer.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy
		c.Writer.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

		// Remove server header
		c.Writer.Header().Del("Server")
		c.Writer.Header().Del("X-Powered-By")

		c.Next()
	}
}
