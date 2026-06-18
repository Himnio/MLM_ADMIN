package repositories

import (
	"errors"
	"time"

	"mlm-admin-backend/internal/database"
	"mlm-admin-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AdminRepository handles database operations for admins
type AdminRepository interface {
	Create(admin *models.Admin) error
	GetByID(id uuid.UUID) (*models.Admin, error)
	GetByEmail(email string) (*models.Admin, error)
	Update(admin *models.Admin) error
	Delete(id uuid.UUID) error
	List(filter *models.MemberFilter, page, limit int) ([]*models.Admin, int64, error)
	UpdateLastLogin(id uuid.UUID) error
	IncrementFailedAttempts(id uuid.UUID) error
	ResetFailedAttempts(id uuid.UUID) error
	LockAccount(id uuid.UUID, duration time.Duration) error
	UnlockAccount(id uuid.UUID) error
}

type adminRepository struct {
	db *database.PostgresDB
}

// NewAdminRepository creates a new admin repository
func NewAdminRepository(db *database.PostgresDB) AdminRepository {
	return &adminRepository{db: db}
}

// Create creates a new admin
func (r *adminRepository) Create(admin *models.Admin) error {
	return r.db.DB.Create(admin).Error
}

// GetByID retrieves an admin by ID
func (r *adminRepository) GetByID(id uuid.UUID) (*models.Admin, error) {
	var admin models.Admin
	err := r.db.DB.Where("id = ?", id).First(&admin).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &admin, nil
}

// GetByEmail retrieves an admin by email
func (r *adminRepository) GetByEmail(email string) (*models.Admin, error) {
	var admin models.Admin
	err := r.db.DB.Where("email = ?", email).First(&admin).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &admin, nil
}

// Update updates an admin
func (r *adminRepository) Update(admin *models.Admin) error {
	return r.db.DB.Save(admin).Error
}

// Delete soft deletes an admin
func (r *adminRepository) Delete(id uuid.UUID) error {
	return r.db.DB.Delete(&models.Admin{}, id).Error
}

// List retrieves admins with pagination and filtering
func (r *adminRepository) List(filter *models.MemberFilter, page, limit int) ([]*models.Admin, int64, error) {
	var admins []*models.Admin
	var total int64

	query := r.db.DB.Model(&models.Admin{})

	// Apply filters
	if filter != nil {
		if filter.Status != nil {
			query = query.Where("status = ?", *filter.Status)
		}
		if filter.Search != nil {
			searchPattern := "%" + *filter.Search + "%"
			query = query.Where("email LIKE ? OR full_name LIKE ?", searchPattern, searchPattern)
		}
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&admins).Error
	if err != nil {
		return nil, 0, err
	}

	return admins, total, nil
}

// UpdateLastLogin updates the last login timestamp
func (r *adminRepository) UpdateLastLogin(id uuid.UUID) error {
	return r.db.DB.Model(&models.Admin{}).Where("id = ?", id).Update("last_login", time.Now()).Error
}

// IncrementFailedAttempts increments the failed login attempts
func (r *adminRepository) IncrementFailedAttempts(id uuid.UUID) error {
	return r.db.DB.Model(&models.Admin{}).Where("id = ?", id).UpdateColumn("failed_attempts", gorm.Expr("failed_attempts + 1")).Error
}

// ResetFailedAttempts resets the failed login attempts
func (r *adminRepository) ResetFailedAttempts(id uuid.UUID) error {
	return r.db.DB.Model(&models.Admin{}).Where("id = ?", id).Updates(map[string]interface{}{
		"failed_attempts": 0,
		"locked_until":    nil,
	}).Error
}

// LockAccount locks an admin account
func (r *adminRepository) LockAccount(id uuid.UUID, duration time.Duration) error {
	lockedUntil := time.Now().Add(duration)
	return r.db.DB.Model(&models.Admin{}).Where("id = ?", id).Update("locked_until", lockedUntil).Error
}

// UnlockAccount unlocks an admin account
func (r *adminRepository) UnlockAccount(id uuid.UUID) error {
	return r.db.DB.Model(&models.Admin{}).Where("id = ?", id).Updates(map[string]interface{}{
		"failed_attempts": 0,
		"locked_until":    nil,
	}).Error
}