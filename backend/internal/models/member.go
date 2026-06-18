package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Member represents an MLM member in the system
type Member struct {
	ID         uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	SponsorID  *uuid.UUID     `gorm:"type:uuid;index" json:"sponsor_id,omitempty"`
	Sponsor    *Member        `gorm:"foreignKey:SponsorID" json:"sponsor,omitempty"`
	MemberCode string         `gorm:"type:varchar(50);uniqueIndex;not null" json:"member_code"`
	FullName   string         `gorm:"type:varchar(255);not null" json:"full_name"`
	Email      string         `gorm:"type:varchar(255);index" json:"email,omitempty"`
	Phone      string         `gorm:"type:varchar(20)" json:"phone,omitempty"`
	Status     string         `gorm:"type:varchar(20);not null;default:'active'" json:"status"`
	JoinedAt   time.Time      `gorm:"not null" json:"joined_at"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Downlines []Member   `gorm:"foreignKey:SponsorID" json:"downlines,omitempty"`
	Referrals []Referral `gorm:"foreignKey:ParentID" json:"referrals,omitempty"`
	Incomes   []Income   `gorm:"foreignKey:MemberID" json:"incomes,omitempty"`
}

// TableName specifies the table name for Member model
func (Member) TableName() string {
	return "members"
}

// BeforeCreate hook to generate UUID and MemberCode before inserting
func (m *Member) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	if m.MemberCode == "" {
		// Generate member code: MBR + timestamp + random
		m.MemberCode = generateMemberCode()
	}
	if m.JoinedAt.IsZero() {
		m.JoinedAt = time.Now()
	}
	return nil
}

// generateMemberCode generates a unique member code
func generateMemberCode() string {
	// Simple implementation - in production, use a more robust method
	now := time.Now()
	return fmt.Sprintf("MBR%d%d", now.Unix(), now.Nanosecond()%1000)
}

// MemberStatus represents available member statuses
type MemberStatus string

const (
	StatusActive        MemberStatus = "active"
	StatusInactive      MemberStatus = "inactive"
	StatusPendingMember MemberStatus = "pending"
	StatusSuspended     MemberStatus = "suspended"
)

// CreateMemberInput represents input for creating a member
type CreateMemberInput struct {
	SponsorID string `json:"sponsor_id,omitempty" validate:"omitempty,uuid"`
	FullName  string `json:"full_name" validate:"required"`
	Email     string `json:"email,omitempty" validate:"omitempty,email"`
	Phone     string `json:"phone,omitempty" validate:"omitempty"`
}

// UpdateMemberInput represents input for updating a member
type UpdateMemberInput struct {
	FullName *string `json:"full_name,omitempty" validate:"omitempty"`
	Email    *string `json:"email,omitempty" validate:"omitempty,email"`
	Phone    *string `json:"phone,omitempty" validate:"omitempty"`
	Status   *string `json:"status,omitempty" validate:"omitempty,oneof=active inactive pending suspended"`
}

// MemberResponse represents the response for member data
type MemberResponse struct {
	ID         string    `json:"id"`
	SponsorID  *string   `json:"sponsor_id,omitempty"`
	MemberCode string    `json:"member_code"`
	FullName   string    `json:"full_name"`
	Email      string    `json:"email,omitempty"`
	Phone      string    `json:"phone,omitempty"`
	Status     string    `json:"status"`
	JoinedAt   time.Time `json:"joined_at"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// ToResponse converts Member to MemberResponse
func (m *Member) ToResponse() *MemberResponse {
	resp := &MemberResponse{
		ID:         m.ID.String(),
		MemberCode: m.MemberCode,
		FullName:   m.FullName,
		Email:      m.Email,
		Phone:      m.Phone,
		Status:     m.Status,
		JoinedAt:   m.JoinedAt,
		CreatedAt:  m.CreatedAt,
		UpdatedAt:  m.UpdatedAt,
	}

	if m.SponsorID != nil {
		sponsorIDStr := m.SponsorID.String()
		resp.SponsorID = &sponsorIDStr
	}

	return resp
}

// MemberWithDownlineCount extends MemberResponse with downline count
type MemberWithDownlineCount struct {
	*MemberResponse
	DownlineCount int `json:"downline_count"`
	Level1Count   int `json:"level_1_count"`
	Level2Count   int `json:"level_2_count"`
	Level3Count   int `json:"level_3_count"`
}

// MemberWithLevel extends Member with relationship level for tree operations
type MemberWithLevel struct {
	Member
	RelationshipLevel int `json:"relationship_level"`
}

// MemberFilter represents filter options for member queries
type MemberFilter struct {
	Status    *string    `json:"status,omitempty"`
	SponsorID *uuid.UUID `json:"sponsor_id,omitempty"`
	Email     *string    `json:"email,omitempty"`
	Phone     *string    `json:"phone,omitempty"`
	FromDate  *time.Time `json:"from_date,omitempty"`
	ToDate    *time.Time `json:"to_date,omitempty"`
	Search    *string    `json:"search,omitempty"`
}

// ToMap converts MemberFilter to a map for GORM queries
func (f *MemberFilter) ToMap() map[string]interface{} {
	m := make(map[string]interface{})

	if f.Status != nil {
		m["status"] = *f.Status
	}
	if f.SponsorID != nil {
		m["sponsor_id"] = *f.SponsorID
	}
	if f.Email != nil {
		m["email"] = *f.Email
	}
	if f.Phone != nil {
		m["phone"] = *f.Phone
	}

	return m
}
