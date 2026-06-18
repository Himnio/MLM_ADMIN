package models

import (
	"time"
)

// CommissionConfig represents MLM commission structure per level
type CommissionConfig struct {
	ID                   string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Level                int       `gorm:"not null;uniqueIndex" json:"level"`                       // Level in MLM (1-10)
	IncomeAmount         float64   `gorm:"type:numeric(10,2);not null" json:"income_amount"`        // Income per referral at this level
	SeatCapacity         int       `gorm:"not null" json:"seat_capacity"`                           // Max referrals allowed at this level
	CommissionPercentage float64   `gorm:"type:numeric(5,2);not null" json:"commission_percentage"` // % of referral's package
	IsActive             bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt            time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// TableName overrides the table name used by Gorm
func (CommissionConfig) TableName() string {
	return "level_commission_configs"
}

// CommissionResponse represents the commission config for API responses
type CommissionResponse struct {
	ID                   string  `json:"id"`
	Level                int     `json:"level"`
	IncomeAmount         float64 `json:"income_amount"`
	SeatCapacity         int     `json:"seat_capacity"`
	CommissionPercentage float64 `json:"commission_percentage"`
	IsActive             bool    `json:"is_active"`
}

// ToResponse converts CommissionConfig to CommissionResponse
func (c *CommissionConfig) ToResponse() *CommissionResponse {
	return &CommissionResponse{
		ID:                   c.ID,
		Level:                c.Level,
		IncomeAmount:         c.IncomeAmount,
		SeatCapacity:         c.SeatCapacity,
		CommissionPercentage: c.CommissionPercentage,
		IsActive:             c.IsActive,
	}
}

// IncomeProjection tracks income projections and actuals per member per level
type IncomeProjection struct {
	ID                 string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	MemberID           string    `gorm:"type:uuid;not null;index" json:"member_id"`
	Level              int       `gorm:"not null" json:"level"`
	PotentialIncome    float64   `gorm:"type:numeric(10,2);not null" json:"potential_income"`
	ActualIncome       float64   `gorm:"type:numeric(10,2);not null;default:0" json:"actual_income"`
	SeatFilled         int       `gorm:"not null;default:0" json:"seat_filled"`
	PercentageComplete float64   `gorm:"type:numeric(5,2);not null;default:0" json:"percentage_complete"`
	CalculatedAt       time.Time `gorm:"autoUpdateTime" json:"calculated_at"`
	CreatedAt          time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// TableName overrides the table name used by Gorm
func (IncomeProjection) TableName() string {
	return "income_projections"
}

// IncomeProjectionResponse represents income projection for API responses
type IncomeProjectionResponse struct {
	ID                 string  `json:"id"`
	MemberID           string  `json:"member_id"`
	Level              int     `json:"level"`
	PotentialIncome    float64 `json:"potential_income"`
	ActualIncome       float64 `json:"actual_income"`
	SeatFilled         int     `json:"seat_filled"`
	PercentageComplete float64 `json:"percentage_complete"`
	CalculatedAt       string  `json:"calculated_at"`
}

// ToResponse converts IncomeProjection to IncomeProjectionResponse
func (ip *IncomeProjection) ToResponse() *IncomeProjectionResponse {
	return &IncomeProjectionResponse{
		ID:                 ip.ID,
		MemberID:           ip.MemberID,
		Level:              ip.Level,
		PotentialIncome:    ip.PotentialIncome,
		ActualIncome:       ip.ActualIncome,
		SeatFilled:         ip.SeatFilled,
		PercentageComplete: ip.PercentageComplete,
		CalculatedAt:       ip.CalculatedAt.Format(time.RFC3339),
	}
}
