package middleware

import (
	"sync"
	"time"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// rateLimiter stores request timestamps for each client
type rateLimiter struct {
	visitors map[string]*visitor
	mu       sync.Mutex
	requests int
	window   time.Duration
}

// visitor stores request timestamps for a single client
type visitor struct {
	lastSeen time.Time
	requests []time.Time
}

// RateLimiter returns a rate limiting middleware
func RateLimiter(cfg config.RateLimitConfig) gin.HandlerFunc {
	limiter := &rateLimiter{
		visitors: make(map[string]*visitor),
		requests: cfg.Requests,
		window:   cfg.Window,
	}

	// Start cleanup goroutine
	go limiter.cleanup()

	return func(c *gin.Context) {
		if !cfg.Enabled {
			c.Next()
			return
		}

		// Get client identifier (IP address)
		clientIP := c.ClientIP()
		
		// Check if client is rate limited
		if !limiter.allow(clientIP) {
			utils.GetGlobalLogger().Warn("Rate limit exceeded", map[string]interface{}{
				"client_ip": clientIP,
				"path":      c.Request.URL.Path,
			})
			
			c.JSON(429, gin.H{
				"success": false,
				"message": "Too many requests",
				"error":   "Rate limit exceeded. Please try again later.",
				"retry_after": limiter.window.Seconds(),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// allow checks if a client is allowed to make a request
func (rl *rateLimiter) allow(clientIP string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

	// Get or create visitor
	v, exists := rl.visitors[clientIP]
	if !exists {
		rl.visitors[clientIP] = &visitor{
			lastSeen: now,
			requests: []time.Time{now},
		}
		return true
	}

	// Update last seen
	v.lastSeen = now

	// Filter requests within the window
	validRequests := make([]time.Time, 0)
	for _, t := range v.requests {
		if t.After(windowStart) {
			validRequests = append(validRequests, t)
		}
	}

	// Check if under limit
	if len(validRequests) >= rl.requests {
		v.requests = validRequests
		return false
	}

	// Add current request
	v.requests = append(validRequests, now)
	return true
}

// cleanup removes old visitor records
func (rl *rateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, v := range rl.visitors {
			if now.Sub(v.lastSeen) > rl.window*2 {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// PerRouteRateLimiter creates rate limiter for specific routes
func PerRouteRateLimiter(route string, requests int, window time.Duration) gin.HandlerFunc {
	limiter := &rateLimiter{
		visitors: make(map[string]*visitor),
		requests: requests,
		window:   window,
	}

	go limiter.cleanup()

	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		if !limiter.allow(clientIP) {
			c.JSON(429, gin.H{
				"success": false,
				"message": "Too many requests",
				"error":   "Rate limit exceeded for this endpoint.",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}