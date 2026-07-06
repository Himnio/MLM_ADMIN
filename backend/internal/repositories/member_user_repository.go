package repositories

import (
	"errors"

	"mlm-admin-backend/internal/database"
	"mlm-admin-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MemberUserRepository interface {
	Create(user *models.MemberUser) error
	GetByID(id uuid.UUID) (*models.MemberUser, error)
	GetByMemberID(memberID string) (*models.MemberUser, error)
	GetByUsername(username string) (*models.MemberUser, error)
	GetByReferralCode(code string) ([]*models.MemberUser, error)
	GetByMemberIDOrUsername(login string) (*models.MemberUser, error)
	GetByEmail(email string) (*models.MemberUser, error)
	GetByMobile(mobile string) (*models.MemberUser, error)
	CountByReferralCode(code string) (int64, error)
	GetAll(page, limit int) ([]*models.MemberUser, int64, error)
	Update(user *models.MemberUser) error
	ToggleActive(id uuid.UUID) error
	UpdatePassword(id uuid.UUID, passwordHash string) error
	SetPasswordChanged(id uuid.UUID) error
	ClearReferralCode(code string) error
	DeleteByID(id uuid.UUID) error
}

type memberUserRepository struct {
	db *database.PostgresDB
}

func NewMemberUserRepository(db *database.PostgresDB) MemberUserRepository {
	return &memberUserRepository{db: db}
}

func (r *memberUserRepository) Create(user *models.MemberUser) error {
	return r.db.DB.Create(user).Error
}

func (r *memberUserRepository) GetByID(id uuid.UUID) (*models.MemberUser, error) {
	var u models.MemberUser
	err := r.db.DB.Where("id = ?", id).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *memberUserRepository) GetByMemberID(memberID string) (*models.MemberUser, error) {
	var u models.MemberUser
	err := r.db.DB.Where("member_id = ?", memberID).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *memberUserRepository) GetByUsername(username string) (*models.MemberUser, error) {
	var u models.MemberUser
	err := r.db.DB.Where("username = ?", username).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *memberUserRepository) GetByMemberIDOrUsername(login string) (*models.MemberUser, error) {
	var u models.MemberUser
	err := r.db.DB.Where("member_id = ? OR username = ?", login, login).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *memberUserRepository) GetByReferralCode(code string) ([]*models.MemberUser, error) {
	var users []*models.MemberUser
	err := r.db.DB.Where("referral_code = ?", code).Order("created_at DESC").Find(&users).Error
	return users, err
}

func (r *memberUserRepository) ClearReferralCode(code string) error {
	return r.db.DB.Model(&models.MemberUser{}).Where("referral_code = ?", code).Update("referral_code", gorm.Expr("NULL")).Error
}

func (r *memberUserRepository) DeleteByID(id uuid.UUID) error {
	return r.db.DB.Where("id = ?", id).Delete(&models.MemberUser{}).Error
}

func (r *memberUserRepository) GetByEmail(email string) (*models.MemberUser, error) {
	var u models.MemberUser
	err := r.db.DB.Where("email = ?", email).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *memberUserRepository) GetByMobile(mobile string) (*models.MemberUser, error) {
	var u models.MemberUser
	err := r.db.DB.Where("mobile = ?", mobile).First(&u).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *memberUserRepository) CountByReferralCode(code string) (int64, error) {
	var count int64
	err := r.db.DB.Model(&models.MemberUser{}).Where("referral_code = ?", code).Count(&count).Error
	return count, err
}

func (r *memberUserRepository) GetAll(page, limit int) ([]*models.MemberUser, int64, error) {
	var users []*models.MemberUser
	var total int64
	r.db.DB.Model(&models.MemberUser{}).Count(&total)
	offset := (page - 1) * limit
	err := r.db.DB.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error
	return users, total, err
}

func (r *memberUserRepository) Update(user *models.MemberUser) error {
	return r.db.DB.Save(user).Error
}

func (r *memberUserRepository) ToggleActive(id uuid.UUID) error {
	return r.db.DB.Model(&models.MemberUser{}).Where("id = ?", id).Update("is_active", gorm.Expr("NOT is_active")).Error
}

func (r *memberUserRepository) UpdatePassword(id uuid.UUID, passwordHash string) error {
	return r.db.DB.Model(&models.MemberUser{}).Where("id = ?", id).Update("password_hash", passwordHash).Error
}

func (r *memberUserRepository) SetPasswordChanged(id uuid.UUID) error {
	return r.db.DB.Model(&models.MemberUser{}).Where("id = ?", id).Update("must_change_password", false).Error
}
