package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReferralCode struct {
	ID                uuid.UUID  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ReferralCode      string     `gorm:"column:referral_code;type:varchar(50);uniqueIndex;not null" json:"referral_code"`
	CreatedByUsername string     `gorm:"column:created_by_username;type:varchar(100);not null" json:"created_by_username"`
	AdminID           *uuid.UUID `gorm:"column:admin_id;type:uuid;index" json:"admin_id"`
	CreatedAt         time.Time  `gorm:"column:created_at;default:CURRENT_TIMESTAMP" json:"created_at"`
	IsActive          bool       `gorm:"column:is_active;default:true" json:"is_active"`
}

func (ReferralCode) TableName() string {
	return "referral_codes"
}

func (rc *ReferralCode) BeforeCreate(tx *gorm.DB) error {
	if rc.ID == uuid.Nil {
		rc.ID = uuid.New()
	}
	return nil
}

type ReferralRegistration struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	ReferralCode string    `gorm:"column:referral_code;type:varchar(50);not null" json:"referral_code"`
	Name         string    `gorm:"column:name;type:varchar(100);not null" json:"name"`
	Username     string    `gorm:"column:username;type:varchar(100);uniqueIndex;not null" json:"username"`
	Email        string    `gorm:"column:email;type:varchar(150);uniqueIndex;not null" json:"email"`
	PanCardID    string    `gorm:"column:pan_card_id;type:varchar(20);not null" json:"pan_card_id"`
	FullName     string    `gorm:"column:full_name;type:varchar(150);not null" json:"full_name"`
	RegisteredAt time.Time `gorm:"column:registered_at;default:CURRENT_TIMESTAMP" json:"registered_at"`
}

func (ReferralRegistration) TableName() string {
	return "referral_registrations"
}

func (rr *ReferralRegistration) BeforeCreate(tx *gorm.DB) error {
	if rr.ID == uuid.Nil {
		rr.ID = uuid.New()
	}
	return nil
}
