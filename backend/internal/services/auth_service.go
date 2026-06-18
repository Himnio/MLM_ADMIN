package services

import (
	"errors"
	"fmt"
	"time"

	"mlm-admin-backend/internal/auth"
	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/repositories"
	"mlm-admin-backend/internal/utils"

	"github.com/google/uuid"
)

// AuthService handles authentication business logic
type AuthService interface {
	Login(email, password string) (*auth.TokenPair, *models.Admin, error)
	Logout(token string) error
	RefreshToken(refreshToken string) (*auth.TokenPair, error)
	ValidateToken(token string) (*auth.JWTClaims, error)
	ChangePassword(adminID uuid.UUID, oldPassword, newPassword string) error
	RegisterAdmin(email, password, fullName, role string) (*models.Admin, error)
	GetAdminProfile(adminID uuid.UUID) (*models.Admin, error)
}

type authService struct {
	adminRepo repositories.AdminRepository
	jwtMgr    *auth.JWTManager
	config    *config.Config
	logger    *utils.Logger
}

// NewAuthService creates a new auth service
func NewAuthService(
	adminRepo repositories.AdminRepository,
	jwtMgr *auth.JWTManager,
	cfg *config.Config,
	logger *utils.Logger,
) AuthService {
	return &authService{
		adminRepo: adminRepo,
		jwtMgr:    jwtMgr,
		config:    cfg,
		logger:    logger,
	}
}

// Login authenticates an admin and returns tokens
func (s *authService) Login(email, password string) (*auth.TokenPair, *models.Admin, error) {
	// Get admin by email
	admin, err := s.adminRepo.GetByEmail(email)
	if err != nil {
		s.logger.Error(err, "Failed to get admin by email", map[string]interface{}{
			"email": email,
		})
		return nil, nil, errors.New("invalid credentials")
	}

	if admin == nil {
		return nil, nil, errors.New("invalid credentials")
	}

	// Check if account is locked
	if admin.IsLocked() {
		return nil, nil, errors.New("account is locked. Please try again later")
	}

	// Verify password
	if !auth.CheckPasswordHash(password, admin.PasswordHash) {
		// Increment failed attempts
		s.adminRepo.IncrementFailedAttempts(admin.ID)

		// Check if should lock account
		if admin.FailedAttempts+1 >= s.config.Security.MaxLoginAttempts {
			s.adminRepo.LockAccount(admin.ID, s.config.Security.LockoutDuration)
			s.logger.Warn("Account locked due to multiple failed attempts", map[string]interface{}{
				"admin_id": admin.ID,
				"email":    email,
			})
		}

		return nil, nil, errors.New("invalid credentials")
	}

	// Reset failed attempts on successful login
	s.adminRepo.ResetFailedAttempts(admin.ID)

	// Check if admin is active
	if !admin.IsActive {
		return nil, nil, errors.New("account is inactive")
	}

	// Generate token pair
	tokens, err := s.jwtMgr.GenerateTokenPair(admin.ID, admin.Email, admin.Role)
	if err != nil {
		s.logger.Error(err, "Failed to generate tokens", map[string]interface{}{
			"admin_id": admin.ID,
		})
		return nil, nil, errors.New("failed to generate tokens")
	}

	// Update last login
	s.adminRepo.UpdateLastLogin(admin.ID)

	s.logger.Info("Admin logged in successfully", map[string]interface{}{
		"admin_id": admin.ID,
		"email":    admin.Email,
	})

	return tokens, admin, nil
}

// Logout invalidates a token
func (s *authService) Logout(token string) error {
	// In production, add token to blacklist in Redis
	return s.jwtMgr.RevokeToken(token)
}

// RefreshToken generates new tokens using a refresh token
func (s *authService) RefreshToken(refreshToken string) (*auth.TokenPair, error) {
	tokens, err := s.jwtMgr.RefreshAccessToken(refreshToken)
	if err != nil {
		s.logger.Error(err, "Failed to refresh token", nil)
		return nil, errors.New("invalid or expired refresh token")
	}

	return tokens, nil
}

// ValidateToken validates a JWT token
func (s *authService) ValidateToken(token string) (*auth.JWTClaims, error) {
	claims, err := s.jwtMgr.ValidateAccessToken(token)
	if err != nil {
		return nil, errors.New("invalid or expired token")
	}

	// Check if admin still exists and is active
	adminID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, errors.New("invalid token")
	}

	admin, err := s.adminRepo.GetByID(adminID)
	if err != nil {
		return nil, errors.New("admin not found")
	}

	if admin == nil || !admin.IsActive {
		return nil, errors.New("admin account is inactive")
	}

	return claims, nil
}

// ChangePassword changes an admin's password
func (s *authService) ChangePassword(adminID uuid.UUID, oldPassword, newPassword string) error {
	// Get admin
	admin, err := s.adminRepo.GetByID(adminID)
	if err != nil {
		return err
	}

	if admin == nil {
		return errors.New("admin not found")
	}

	// Verify old password
	if !auth.CheckPasswordHash(oldPassword, admin.PasswordHash) {
		return errors.New("invalid current password")
	}

	// Validate new password
	if err := auth.ValidatePassword(newPassword); err != nil {
		return err
	}

	// Hash new password
	hashedPassword, err := auth.HashPassword(newPassword, s.config.Security.BcryptCost)
	if err != nil {
		return err
	}

	// Update password
	admin.PasswordHash = hashedPassword
	return s.adminRepo.Update(admin)
}

// RegisterAdmin creates a new admin
func (s *authService) RegisterAdmin(email, password, fullName, role string) (*models.Admin, error) {
	// Check if email already exists
	existingAdmin, err := s.adminRepo.GetByEmail(email)
	if err != nil {
		return nil, err
	}

	if existingAdmin != nil {
		return nil, errors.New("email already registered")
	}

	// Validate password
	if err := auth.ValidatePassword(password); err != nil {
		return nil, err
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(password, s.config.Security.BcryptCost)
	if err != nil {
		return nil, err
	}

	// Create admin
	admin := &models.Admin{
		Email:        email,
		PasswordHash: hashedPassword,
		FullName:     fullName,
		Role:         role,
		IsActive:     true,
	}

	if err := s.adminRepo.Create(admin); err != nil {
		return nil, err
	}

	s.logger.Info("New admin registered", map[string]interface{}{
		"admin_id": admin.ID,
		"email":    admin.Email,
		"role":     admin.Role,
	})

	return admin, nil
}

// GetAdminProfile retrieves an admin's profile
func (s *authService) GetAdminProfile(adminID uuid.UUID) (*models.Admin, error) {
	admin, err := s.adminRepo.GetByID(adminID)
	if err != nil {
		return nil, err
	}

	if admin == nil {
		return nil, errors.New("admin not found")
	}

	return admin, nil
}

// LoginRequest represents a login request
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	AccessToken  string              `json:"access_token"`
	RefreshToken string              `json:"refresh_token"`
	ExpiresAt    time.Time           `json:"expires_at"`
	TokenType    string              `json:"token_type"`
	Admin        *models.AdminResponse `json:"admin"`
}

// ToLoginResponse converts TokenPair and Admin to LoginResponse
func ToLoginResponse(tokens *auth.TokenPair, admin *models.Admin) *LoginResponse {
	return &LoginResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt,
		TokenType:    tokens.TokenType,
		Admin:        admin.ToResponse(),
	}
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

// RegisterAdminRequest represents a register admin request
type RegisterAdminRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	FullName string `json:"full_name" validate:"required"`
	Role     string `json:"role" validate:"required,oneof=admin viewer super_admin"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}

// NewErrorResponse creates a new error response
func NewErrorResponse(message string, err string) *ErrorResponse {
	return &ErrorResponse{
		Success: false,
		Message: message,
		Error:   err,
	}
}

// SuccessResponse represents a success response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// NewSuccessResponse creates a new success response
func NewSuccessResponse(message string, data interface{}) *SuccessResponse {
	return &SuccessResponse{
		Success: true,
		Message: message,
		Data:    data,
	}
}

// Suppress unused import
var _ = fmt.Sprintf