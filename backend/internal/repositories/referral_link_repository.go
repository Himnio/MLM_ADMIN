package repositories

import (
	"errors"

	"mlm-admin-backend/internal/database"
	"mlm-admin-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReferralLinkRepository interface {
	CreateReferralCode(code *models.ReferralCode) error
	GetReferralCodeByCode(code string) (*models.ReferralCode, error)
	GetReferralCodesByAdminID(adminID uuid.UUID) ([]*models.ReferralCode, error)
	GetAllReferralCodes() ([]*models.ReferralCode, error)
	SearchReferralCodesByCreator(username string) ([]*models.ReferralCode, error)
	CreateRegistration(reg *models.ReferralRegistration) error
	GetRegistrationsByReferralCode(code string) ([]*models.ReferralRegistration, error)
	CheckUsernameExists(username string) (bool, error)
	CheckEmailExists(email string) (bool, error)
}

type referralLinkRepository struct {
	db *database.PostgresDB
}

func NewReferralLinkRepository(db *database.PostgresDB) ReferralLinkRepository {
	return &referralLinkRepository{db: db}
}

func (r *referralLinkRepository) CreateReferralCode(code *models.ReferralCode) error {
	return r.db.DB.Create(code).Error
}

func (r *referralLinkRepository) GetReferralCodeByCode(code string) (*models.ReferralCode, error) {
	var rc models.ReferralCode
	err := r.db.DB.Where("referral_code = ?", code).First(&rc).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &rc, nil
}

func (r *referralLinkRepository) GetReferralCodesByAdminID(adminID uuid.UUID) ([]*models.ReferralCode, error) {
	var codes []*models.ReferralCode
	err := r.db.DB.Where("admin_id = ?", adminID).Order("created_at DESC").Find(&codes).Error
	return codes, err
}

func (r *referralLinkRepository) GetAllReferralCodes() ([]*models.ReferralCode, error) {
	var codes []*models.ReferralCode
	err := r.db.DB.Order("created_at DESC").Find(&codes).Error
	return codes, err
}

func (r *referralLinkRepository) SearchReferralCodesByCreator(username string) ([]*models.ReferralCode, error) {
	var codes []*models.ReferralCode
	err := r.db.DB.Where("LOWER(created_by_username) LIKE LOWER(?)", "%"+username+"%").Order("created_at DESC").Find(&codes).Error
	return codes, err
}

func (r *referralLinkRepository) CreateRegistration(reg *models.ReferralRegistration) error {
	return r.db.DB.Create(reg).Error
}

func (r *referralLinkRepository) GetRegistrationsByReferralCode(code string) ([]*models.ReferralRegistration, error) {
	var regs []*models.ReferralRegistration
	err := r.db.DB.Where("referral_code = ?", code).Order("registered_at DESC").Find(&regs).Error
	return regs, err
}

func (r *referralLinkRepository) CheckUsernameExists(username string) (bool, error) {
	var count int64
	err := r.db.DB.Model(&models.ReferralRegistration{}).Where("username = ?", username).Count(&count).Error
	return count > 0, err
}

func (r *referralLinkRepository) CheckEmailExists(email string) (bool, error) {
	var count int64
	err := r.db.DB.Model(&models.ReferralRegistration{}).Where("email = ?", email).Count(&count).Error
	return count > 0, err
}
