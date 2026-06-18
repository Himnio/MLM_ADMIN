package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Referral represents a referral relationship in the MLM tree
type Referral struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	ParentID  uuid.UUID      `gorm:"type:uuid;not null;index:idx_parent_child,unique" json:"parent_id"`
	ChildID   uuid.UUID      `gorm:"type:uuid;not null;index:idx_parent_child,unique" json:"child_id"`
	Level     int            `gorm:"not null;index" json:"level"`
	CreatedAt time.Time      `json:"created_at"`
	
	// Relationships
	Parent    *Member        `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Child     *Member        `gorm:"foreignKey:ChildID" json:"child,omitempty"`
}

// TableName specifies the table name for Referral model
func (Referral) TableName() string {
	return "referrals"
}

// BeforeCreate hook to generate UUID before inserting
func (r *Referral) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

// CreateReferralInput represents input for creating a referral relationship
type CreateReferralInput struct {
	ParentID string `json:"parent_id" validate:"required,uuid"`
	ChildID  string `json:"child_id" validate:"required,uuid"`
	Level    int    `json:"level" validate:"required,min=1,max=10"`
}

// ReferralResponse represents the response for referral data
type ReferralResponse struct {
	ID        string     `json:"id"`
	ParentID  string     `json:"parent_id"`
	ChildID   string     `json:"child_id"`
	Level     int        `json:"level"`
	CreatedAt time.Time  `json:"created_at"`
}

// ToResponse converts Referral to ReferralResponse
func (r *Referral) ToResponse() *ReferralResponse {
	return &ReferralResponse{
		ID:        r.ID.String(),
		ParentID:  r.ParentID.String(),
		ChildID:   r.ChildID.String(),
		Level:     r.Level,
		CreatedAt: r.CreatedAt,
	}
}

// ReferralTreeNode represents a node in the referral tree
type ReferralTreeNode struct {
	Member   *Member            `json:"member"`
	Level    int                `json:"level"`
	Children []*ReferralTreeNode `json:"children,omitempty"`
}

// ReferralTree represents the complete referral tree
type ReferralTree struct {
	Root    *ReferralTreeNode `json:"root"`
	TotalNodes int            `json:"total_nodes"`
	MaxDepth   int            `json:"max_depth"`
}

// DownlineMember represents a member in the downline with level information
type DownlineMember struct {
	ID         string    `json:"id"`
	MemberCode string    `json:"member_code"`
	FullName   string    `json:"full_name"`
	Email      string    `json:"email,omitempty"`
	Phone      string    `json:"phone,omitempty"`
	Level      int       `json:"level"`
	JoinedAt   time.Time `json:"joined_at"`
}

// ReferralStats represents statistics for a member's referrals
type ReferralStats struct {
	MemberID      string `json:"member_id"`
	TotalDownline int    `json:"total_downline"`
	DirectReferrals int  `json:"direct_referrals"`
	Level1Count   int    `json:"level_1_count"`
	Level2Count   int    `json:"level_2_count"`
	Level3Count   int    `json:"level_3_count"`
	Level4Count   int    `json:"level_4_count"`
	Level5Count   int    `json:"level_5_count"`
	Level6Count   int    `json:"level_6_count"`
	Level7Count   int    `json:"level_7_count"`
	Level8Count   int    `json:"level_8_count"`
	Level9Count   int    `json:"level_9_count"`
	Level10Count  int    `json:"level_10_count"`
}

// ReferralFilter represents filter options for referral queries
type ReferralFilter struct {
	ParentID *uuid.UUID `json:"parent_id,omitempty"`
	ChildID  *uuid.UUID `json:"child_id,omitempty"`
	Level    *int       `json:"level,omitempty"`
}

// ToMap converts ReferralFilter to a map for GORM queries
func (f *ReferralFilter) ToMap() map[string]interface{} {
	m := make(map[string]interface{})
	
	if f.ParentID != nil {
		m["parent_id"] = *f.ParentID
	}
	if f.ChildID != nil {
		m["child_id"] = *f.ChildID
	}
	if f.Level != nil {
		m["level"] = *f.Level
	}
	
	return m
}