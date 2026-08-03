package middleware

import (
	"strings"

	"rudra-admin-backend/internal/auth"
	"rudra-admin-backend/internal/config"
	"rudra-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// MemberAuth returns a JWT authentication middleware for member users
func MemberAuth(cfg *config.JWTConfig) gin.HandlerFunc {
	jwtMgr := auth.NewJWTManager(cfg)

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.UnauthorizedResponse(c, "Authorization header required", "")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.UnauthorizedResponse(c, "Authorization header format must be Bearer {token}", "")
			c.Abort()
			return
		}

		token := parts[1]

		claims, err := jwtMgr.ValidateAccessToken(token)
		if err != nil {
			utils.UnauthorizedResponse(c, "Invalid or expired token", err.Error())
			c.Abort()
			return
		}

		if claims.Role != "member" {
			utils.ForbiddenResponse(c, "Access denied. Member role required.", "")
			c.Abort()
			return
		}

		c.Set("member_user_id", claims.UserID)
		c.Set("member_email", claims.Email)
		c.Set("member_role", claims.Role)
		c.Set("token", token)

		c.Next()
	}
}
