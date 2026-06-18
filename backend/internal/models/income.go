package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Income represents an income transaction in the MLM system
type Income struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	MemberID     uuid.UUID      `gorm:"type:uuid;not null;index:idx_member_id" json:"member_id"`
	FromMemberID uuid.UUID      `gorm:"type:uuid;not null;index:idx_from_member_id" json:"from_member_id"`
	Level        int            `gorm:"not null;index" json:"level"`
	Amount       float64        `gorm:"type:decimal(10,2);not null" json:"amount"`
	Percentage   float64        `gorm:"type:decimal(5,2);not null" json:"percentage"`
	TransactionID string        `gorm:"type:varchar(100);uniqueIndex" json:"transaction_id"`
	Status       string         `gorm:"type:varchar(20);not null;default:'completed'" json:"status"`
	Description  string         `gorm:"type:text" json:"description,omitempty"`
	ProcessedAt  time.Time      `gorm:"not null" json:"processed_at"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	
	// Relationships
	Member       *Member        `gorm:"foreignKey:MemberID" json:"member,omitempty"`
	FromMember   *Member        `gorm:"foreignKey:FromMemberID" json:"from_member,omitempty"`
}

// TableName specifies the table name for Income model
func (Income) TableName() string {
	return "incomes"
}

// BeforeCreate hook to generate UUID before inserting
func (i *Income) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	if i.ProcessedAt.IsZero() {
		i.ProcessedAt = time.Now()
	}
	return nil
}

// IncomeStatus represents available income statuses
type IncomeStatus string

const (
	StatusPending   IncomeStatus = "pending"
	StatusCompleted IncomeStatus = "completed"
	StatusFailed    IncomeStatus = "failed"
	StatusReversed  IncomeStatus = "reversed"
)

// CreateIncomeInput represents input for creating an income record
type CreateIncomeInput struct {
	MemberID      string  `json:"member_id" validate:"required,uuid"`
	FromMemberID  string  `json:"from_member_id" validate:"required,uuid"`
	Level         int     `json:"level" validate:"required,min=1,max=10"`
	Amount        float64 `json:"amount" validate:"required,gt=0"`
	Percentage    float64 `json:"percentage" validate:"required,gt=0,lte=100"`
	TransactionID string  `json:"transaction_id" validate:"required"`
	Description   string  `json:"description,omitempty"`
}

// UpdateIncomeInput represents input for updating an income record
type UpdateIncomeInput struct {
	Status      *string  `json:"status,omitempty" validate:"omitempty,oneof=pending completed failed reversed"`
	Description *string  `json:"description,omitempty"`
}

// IncomeResponse represents the response for income data
type IncomeResponse struct {
	ID            string     `json:"id"`
	MemberID      string     `json:"member_id"`
	FromMemberID  string     `json:"from_member_id"`
	Level         int        `json:"level"`
	Amount        float64    `json:"amount"`
	Percentage    float64    `json:"percentage"`
	TransactionID string     `json:"transaction_id"`
	Status        string     `json:"status"`
	Description   string     `json:"description,omitempty"`
	ProcessedAt   time.Time  `json:"processed_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ToResponse converts Income to IncomeResponse
func (i *Income) ToResponse() *IncomeResponse {
	return &IncomeResponse{
		ID:            i.ID.String(),
		MemberID:      i.MemberID.String(),
		FromMemberID:  i.FromMemberID.String(),
		Level:         i.Level,
		Amount:        i.Amount,
		Percentage:    i.Percentage,
		TransactionID: i.TransactionID,
		Status:        i.Status,
		Description:   i.Description,
		ProcessedAt:   i.ProcessedAt,
		CreatedAt:     i.CreatedAt,
		UpdatedAt:     i.UpdatedAt,
	}
}

// IncomeCalculation represents the calculation for MLM income distribution
type IncomeCalculation struct {
	BaseAmount      float64            `json:"base_amount"`
	LevelPercentages map[int]float64   `json:"level_percentages"` // level -> percentage
	MaxLevels       int                `json:"max_levels"`
}

// IncomeDistribution represents the distributed income for each level
type IncomeDistribution struct {
	Level       int     `json:"level"`
	Percentage  float64 `json:"percentage"`
	Amount      float64 `json:"amount"`
	MemberID    string  `json:"member_id"`
	MemberCode  string  `json:"member_code"`
	MemberName  string  `json:"member_name"`
}

// IncomeCalculationResult represents the result of an income calculation
type IncomeCalculationResult struct {
	BaseAmount      float64               `json:"base_amount"`
	TotalDistributed float64              `json:"total_distributed"`
	Distributions   []IncomeDistribution `json:"distributions"`
	CalculatedAt    time.Time             `json:"calculated_at"`
}

// IncomeFilter represents filter options for income queries
type IncomeFilter struct {
	MemberID     *uuid.UUID `json:"member_id,omitempty"`
	FromMemberID *uuid.UUID `json:"from_member_id,omitempty"`
	Status       *string    `json:"status,omitempty"`
	Level        *int       `json:"level,omitempty"`
	FromDate     *time.Time `json:"from_date,omitempty"`
	ToDate       *time.Time `json:"to_date,omitempty"`
	TransactionID *string   `json:"transaction_id,omitempty"`
}

// ToMap converts IncomeFilter to a map for GORM queries
func (f *IncomeFilter) ToMap() map[string]interface{} {
	m := make(map[string]interface{})
	
	if f.MemberID != nil {
		m["member_id"] = *f.MemberID
	}
	if f.FromMemberID != nil {
		m["from_member_id"] = *f.FromMemberID
	}
	if f.Status != nil {
		m["status"] = *f.Status
	}
	if f.Level != nil {
		m["level"] = *f.Level
	}
	if f.TransactionID != nil {
		m["transaction_id"] = *f.TransactionID
	}
	
	return m
}

// IncomeSummary represents a summary of income data
type IncomeSummary struct {
	TotalIncome      float64 `json:"total_income"`
	TotalDistributed float64 `json:"total_distributed"`
	PendingAmount    float64 `json:"pending_amount"`
	CompletedAmount  float64 `json:"completed_amount"`
	Count            int64   `json:"count"`
	PeriodStart      time.Time `json:"period_start"`
	PeriodEnd        time.Time `json:"period_end"`
}

// LevelCommissionConfig represents the commission percentage for each level
type LevelCommissionConfig struct {
	Level      int     `json:"level"`
	Percentage float64 `json:"percentage"`
	IsActive   bool    `json:"is_active"`
}

// DefaultLevelCommissions returns the default commission percentages for 10 levels
func DefaultLevelCommissions() []LevelCommissionConfig {
	// Example: decreasing percentages for each level
	return []LevelCommissionConfig{
		{Level: 1, Percentage: 10.0, IsActive: true},
		{Level: 2, Percentage: 7.0, IsActive: true},
		{Level: 3, Percentage: 5.0, IsActive: true},
		{Level: 4, Percentage: 4.0, IsActive: true},
		{Level: 5, Percentage: 3.0, IsActive: true},
		{Level: 6, Percentage: 2.5, IsActive: true},
		{Level: 7, Percentage: 2.0, IsActive: true},
		{Level: 8, Percentage: 1.5, IsActive: true},
		{Level: 9, Percentage: 1.0, IsActive: true},
		{Level: 10, Percentage: 0.5, IsActive: true},
	}
}