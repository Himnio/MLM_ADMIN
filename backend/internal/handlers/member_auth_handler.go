package handlers

import (
	"net/http"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/services"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type MemberAuthHandler struct {
	service services.MemberAuthService
	config  *config.Config
	logger  *utils.Logger
}

func NewMemberAuthHandler(
	service services.MemberAuthService,
	cfg *config.Config,
	logger *utils.Logger,
) *MemberAuthHandler {
	return &MemberAuthHandler{
		service: service,
		config:  cfg,
		logger:  logger,
	}
}

type memberLoginRequest struct {
	LoginID  string `json:"login_id"`
	Password string `json:"password"`
}

func (h *MemberAuthHandler) Login(c *gin.Context) {
	var req memberLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	tokenPair, user, err := h.service.Login(req.LoginID, req.Password)
	if err != nil {
		if err.Error() == "invalid credentials" {
			utils.UnauthorizedResponse(c, err.Error(), "")
			return
		}
		h.logger.Error(err, "Member login failed", nil)
		utils.InternalServerErrorResponse(c, "Login failed", "")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"access_token":  tokenPair.AccessToken,
		"refresh_token": tokenPair.RefreshToken,
		"expires_at":    tokenPair.ExpiresAt,
		"token_type":    "Bearer",
		"user":          models.ToMemberUserPublic(user),
	})
}

func (h *MemberAuthHandler) GetProfile(c *gin.Context) {
	userIDStr := c.GetString("member_user_id")
	if userIDStr == "" {
		utils.UnauthorizedResponse(c, "Not authenticated", "")
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid user ID", "")
		return
	}

	user, err := h.service.GetProfile(userID)
	if err != nil {
		h.logger.Error(err, "Failed to get member profile", nil)
		utils.InternalServerErrorResponse(c, "Failed to get profile", "")
		return
	}
	if user == nil {
		utils.NotFoundResponse(c, "User not found", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved", models.ToMemberUserPublic(user))
}

type memberChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (h *MemberAuthHandler) ChangePassword(c *gin.Context) {
	userIDStr := c.GetString("member_user_id")
	if userIDStr == "" {
		utils.UnauthorizedResponse(c, "Not authenticated", "")
		return
	}

	var req memberChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid user ID", "")
		return
	}

	if err := h.service.ChangePassword(userID, req.OldPassword, req.NewPassword); err != nil {
		errMsg := err.Error()
		// Client-side errors (wrong password, weak password, user not found)
		if errMsg == "current password is incorrect" || errMsg == "new password must be at least 6 characters" || errMsg == "user not found" {
			utils.BadRequestResponse(c, "Failed to change password", errMsg)
			return
		}
		// Server-side errors (DB failure, bcrypt failure)
		h.logger.Error(err, "Change password failed", map[string]interface{}{
			"user_id": userID.String(),
		})
		utils.InternalServerErrorResponse(c, "Failed to change password. Please try again.", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Password changed successfully", nil)
}
