package middleware

import (
	"strings"

	"mlm-admin-backend/internal/auth"
	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// Auth returns a JWT authentication middleware
func Auth(cfg *config.JWTConfig) gin.HandlerFunc {
	jwtMgr := auth.NewJWTManager(cfg)

	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.UnauthorizedResponse(c, "Authorization header required", "")
			c.Abort()
			return
		}

		// Check if it's a Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.UnauthorizedResponse(c, "Authorization header format must be Bearer {token}", "")
			c.Abort()
			return
		}

		token := parts[1]

		// Validate token
		claims, err := jwtMgr.ValidateAccessToken(token)
		if err != nil {
			utils.UnauthorizedResponse(c, "Invalid or expired token", err.Error())
			c.Abort()
			return
		}

		// Set claims in context
		c.Set("admin_id", claims.UserID)
		c.Set("admin_email", claims.Email)
		c.Set("admin_role", claims.Role)
		c.Set("token", token)

		c.Next()
	}
}

// RequireRole returns a middleware that checks if the user has the required role
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		adminRole := c.GetString("admin_role")
		if adminRole == "" {
			utils.ForbiddenResponse(c, "Role not found in context", "")
			c.Abort()
			return
		}

		// Check if role is allowed
		allowed := false
		for _, role := range roles {
			if adminRole == role {
				allowed = true
				break
			}
		}

		if !allowed {
			utils.ForbiddenResponse(c, "Insufficient permissions", "Required role: "+strings.Join(roles, " or "))
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth returns a middleware that optionally authenticates if token is present
func OptionalAuth(cfg *config.JWTConfig) gin.HandlerFunc {
	jwtMgr := auth.NewJWTManager(cfg)

	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		// Check if it's a Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		token := parts[1]

		// Validate token (don't fail if invalid)
		claims, err := jwtMgr.ValidateAccessToken(token)
		if err != nil {
			c.Next()
			return
		}

		// Set claims in context
		c.Set("admin_id", claims.UserID)
		c.Set("admin_email", claims.Email)
		c.Set("admin_role", claims.Role)

		c.Next()
	}
}

// AdminActivityMiddleware logs admin activities for audit
func AdminActivityMiddleware(logger *utils.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		adminID := c.GetString("admin_id")
		if adminID != "" {
			// Log admin activity
			logger.Info("Admin action", map[string]interface{}{
				"admin_id": adminID,
				"method":   c.Request.Method,
				"path":     c.Request.URL.Path,
				"ip":       c.ClientIP(),
			})
		}
		c.Next()
	}
}

// RateLimitPerAdmin applies rate limiting per admin user
func RateLimitPerAdmin(requests int, window string) gin.HandlerFunc {
	// Implementation would use Redis to track per-user rate limits
	// For now, use the general rate limiter
	return func(c *gin.Context) {
		c.Next()
	}
}

// Permissions defines available permissions
type Permissions string

const (
	PermViewMembers   Permissions = "members:view"
	PermCreateMembers Permissions = "members:create"
	PermEditMembers   Permissions = "members:edit"
	PermDeleteMembers Permissions = "members:delete"
	PermViewIncomes   Permissions = "incomes:view"
	PermCreateIncomes Permissions = "incomes:create"
	PermEditIncomes   Permissions = "incomes:edit"
	PermDeleteIncomes Permissions = "incomes:delete"
	PermViewReports   Permissions = "reports:view"
	PermExportReports Permissions = "reports:export"
	PermManageAdmins  Permissions = "admins:manage"
	PermSystemConfig  Permissions = "system:config"
)

// RequirePermission returns a middleware that checks if the user has the required permission
func RequirePermission(permissions ...Permissions) gin.HandlerFunc {
	return func(c *gin.Context) {
		adminRole := c.GetString("admin_role")

		// Super admin has all permissions
		if adminRole == "super_admin" {
			c.Next()
			return
		}

		// Check specific permissions based on role
		for _, perm := range permissions {
			if !hasPermission(adminRole, perm) {
				utils.ForbiddenResponse(c, "Insufficient permissions", "Missing permission: "+string(perm))
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// hasPermission checks if a role has a specific permission
func hasPermission(role string, permission Permissions) bool {
	switch role {
	case "super_admin":
		return true
	case "admin":
		// Admin has most permissions except system config and admin management
		return permission != PermSystemConfig && permission != PermManageAdmins
	case "viewer":
		// Viewer only has view and export permissions
		return permission == PermViewMembers ||
			permission == PermViewIncomes ||
			permission == PermViewReports ||
			permission == PermExportReports
	default:
		return false
	}
}
