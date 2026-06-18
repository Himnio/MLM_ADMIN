package handlers

import (
	"net/http"

	"mlm-admin-backend/internal/auth"
	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/services"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// Ensure imports are used (for Swagger annotations)
var (
	_ auth.TokenPair
	_ models.AdminResponse
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	authService services.AuthService
	config      *config.Config
	logger      *utils.Logger
	validator   *validator.Validate
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(
	authService services.AuthService,
	cfg *config.Config,
	logger *utils.Logger,
) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		config:      cfg,
		logger:      logger,
		validator:   validator.New(),
	}
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// RegisterRequest represents a register request
type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	FullName string `json:"full_name" validate:"required"`
	Role     string `json:"role" validate:"required,oneof=admin viewer super_admin"`
}

// RefreshTokenRequest represents a refresh token request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// ChangePasswordRequest represents a change password request
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// @Summary Admin login
// @Description Authenticate admin and return JWT tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} services.LoginResponse
// @Failure 400 {object} utils.Response
// @Failure 401 {object} utils.Response
// @Router /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		h.logger.Error(err, "Invalid login request", nil)
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	if err := h.validator.Struct(req); err != nil {
		utils.ValidationErrorResponse(c, extractValidationErrors(err))
		return
	}

	tokens, admin, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		h.logger.Warn("Login failed", map[string]interface{}{
			"email": req.Email,
			"error": err.Error(),
		})
		utils.UnauthorizedResponse(c, "Authentication failed", err.Error())
		return
	}

	response := services.ToLoginResponse(tokens, admin)
	utils.SuccessResponse(c, http.StatusOK, "Login successful", response)
}

// @Summary Admin logout
// @Description Logout admin and invalidate token
// @Tags auth
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response
// @Router /api/v1/auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get token from context (set by auth middleware)
	token := c.GetString("token")
	if token == "" {
		utils.BadRequestResponse(c, "No token provided", "")
		return
	}

	if err := h.authService.Logout(token); err != nil {
		h.logger.Error(err, "Failed to logout", nil)
		utils.InternalServerErrorResponse(c, "Failed to logout", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Logout successful", nil)
}

// @Summary Refresh access token
// @Description Get new access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RefreshTokenRequest true "Refresh token"
// @Success 200 {object} auth.TokenPair
// @Failure 400 {object} utils.Response
// @Failure 401 {object} utils.Response
// @Router /api/v1/auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	if err := h.validator.Struct(req); err != nil {
		utils.ValidationErrorResponse(c, extractValidationErrors(err))
		return
	}

	tokens, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid refresh token", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Token refreshed successfully", tokens)
}

// @Summary Get current admin profile
// @Description Get the profile of the currently logged in admin
// @Tags auth
// @Produce json
// @Security Bearer
// @Success 200 {object} models.AdminResponse
// @Router /api/v1/auth/me [get]
func (h *AuthHandler) GetProfile(c *gin.Context) {
	adminID := c.GetString("admin_id")
	if adminID == "" {
		utils.UnauthorizedResponse(c, "Not authenticated", "")
		return
	}

	id, err := uuid.Parse(adminID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid admin ID", err.Error())
		return
	}

	admin, err := h.authService.GetAdminProfile(id)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to get profile", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved successfully", admin.ToResponse())
}

// @Summary Change password
// @Description Change the password of the currently logged in admin
// @Tags auth
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body ChangePasswordRequest true "Password change request"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 401 {object} utils.Response
// @Router /api/v1/auth/change-password [post]
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	adminID := c.GetString("admin_id")
	if adminID == "" {
		utils.UnauthorizedResponse(c, "Not authenticated", "")
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	if err := h.validator.Struct(req); err != nil {
		utils.ValidationErrorResponse(c, extractValidationErrors(err))
		return
	}

	id, err := uuid.Parse(adminID)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid admin ID", err.Error())
		return
	}

	if err := h.authService.ChangePassword(id, req.OldPassword, req.NewPassword); err != nil {
		utils.BadRequestResponse(c, "Failed to change password", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Password changed successfully", nil)
}

// @Summary Register new admin
// @Description Register a new admin (super_admin only)
// @Tags auth
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body RegisterRequest true "Admin registration details"
// @Success 201 {object} models.AdminResponse
// @Failure 400 {object} utils.Response
// @Failure 403 {object} utils.Response
// @Router /api/v1/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	// Check if user has permission (super_admin only)
	role := c.GetString("admin_role")
	if role != "super_admin" {
		utils.ForbiddenResponse(c, "Insufficient permissions", "Only super_admin can register new admins")
		return
	}

	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	if err := h.validator.Struct(req); err != nil {
		utils.ValidationErrorResponse(c, extractValidationErrors(err))
		return
	}

	admin, err := h.authService.RegisterAdmin(req.Email, req.Password, req.FullName, req.Role)
	if err != nil {
		utils.BadRequestResponse(c, "Failed to register admin", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Admin registered successfully", admin.ToResponse())
}

// extractValidationErrors extracts validation errors from validator.Error
func extractValidationErrors(err error) map[string]string {
	errors := make(map[string]string)
	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, e := range validationErrors {
			field := e.Field()
			switch e.Tag() {
			case "required":
				errors[field] = field + " is required"
			case "email":
				errors[field] = "Invalid email format"
			case "min":
				errors[field] = field + " must be at least " + e.Param() + " characters"
			case "oneof":
				errors[field] = field + " must be one of: " + e.Param()
			default:
				errors[field] = field + " validation failed"
			}
		}
	}
	return errors
}
