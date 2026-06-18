package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Admin represents an admin user in the system
type Admin struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	Email        string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash string         `gorm:"type:varchar(255);not null" json:"-"`
	FullName     string         `gorm:"type:varchar(255);not null" json:"full_name"`
	Role         string         `gorm:"type:varchar(50);not null;default:'admin'" json:"role"`
	IsActive     bool           `gorm:"not null;default:true" json:"is_active"`
	LastLogin    *time.Time     `json:"last_login,omitempty"`
	FailedAttempts int           `gorm:"not null;default:0" json:"-"`
	LockedUntil  *time.Time     `json:"-"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for Admin model
func (Admin) TableName() string {
	return "admins"
}

// BeforeCreate hook to generate UUID before inserting
func (a *Admin) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// IsLocked checks if the admin account is locked
func (a *Admin) IsLocked() bool {
	if a.LockedUntil == nil {
		return false
	}
	return time.Now().Before(*a.LockedUntil)
}

// Unlock removes the lock on the account
func (a *Admin) Unlock() {
	a.LockedUntil = nil
	a.FailedAttempts = 0
}

// IncrementFailedAttempts increments the failed login attempts
func (a *Admin) IncrementFailedAttempts() {
	a.FailedAttempts++
}

// ResetFailedAttempts resets the failed login attempts
func (a *Admin) ResetFailedAttempts() {
	a.FailedAttempts = 0
	a.LockedUntil = nil
}

// UpdateLastLogin updates the last login timestamp
func (a *Admin) UpdateLastLogin() {
	now := time.Now()
	a.LastLogin = &now
}

// AdminRole represents available admin roles
type AdminRole string

const (
	RoleSuperAdmin AdminRole = "super_admin"
	RoleAdmin      AdminRole = "admin"
	RoleViewer     AdminRole = "viewer"
)

// HasPermission checks if the admin has a specific permission based on role
func (a *Admin) HasPermission(permission string) bool {
	switch a.Role {
	case string(RoleSuperAdmin):
		return true // Super admin has all permissions
	case string(RoleAdmin):
		// Admin has most permissions except some critical ones
		return permission != "delete_admin" && permission != "system_config"
	case string(RoleViewer):
		// Viewer has read-only permissions
		return permission == "view" || permission == "read"
	default:
		return false
	}
}

// CreateAdminInput represents input for creating an admin
type CreateAdminInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	FullName string `json:"full_name" validate:"required"`
	Role     string `json:"role" validate:"required,oneof=admin viewer super_admin"`
}

// UpdateAdminInput represents input for updating an admin
type UpdateAdminInput struct {
	Email    *string `json:"email,omitempty" validate:"omitempty,email"`
	FullName *string `json:"full_name,omitempty" validate:"omitempty"`
	Role     *string `json:"role,omitempty" validate:"omitempty,oneof=admin viewer super_admin"`
	IsActive *bool   `json:"is_active,omitempty"`
}

// AdminResponse represents the response for admin data
type AdminResponse struct {
	ID        string     `json:"id"`
	Email     string     `json:"email"`
	FullName  string     `json:"full_name"`
	Role      string     `json:"role"`
	IsActive  bool       `json:"is_active"`
	LastLogin *time.Time `json:"last_login,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// ToResponse converts Admin to AdminResponse
func (a *Admin) ToResponse() *AdminResponse {
	return &AdminResponse{
		ID:        a.ID.String(),
		Email:     a.Email,
		FullName:  a.FullName,
		Role:      a.Role,
		IsActive:  a.IsActive,
		LastLogin: a.LastLogin,
		CreatedAt: a.CreatedAt,
		UpdatedAt: a.UpdatedAt,
	}
}