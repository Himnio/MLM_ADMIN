package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// IncomeHistory tracks all status changes of income records for audit purposes
type IncomeHistory struct {
	ID             uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	IncomeID       uuid.UUID  `gorm:"type:uuid;not null;index:idx_income_history_income_id" json:"income_id"`
	MemberID       uuid.UUID  `gorm:"type:uuid;not null;index:idx_income_history_member_id" json:"member_id"`
	PreviousStatus *string    `gorm:"type:varchar(20)" json:"previous_status,omitempty"`
	NewStatus      string     `gorm:"type:varchar(20);not null;index:idx_income_history_status" json:"new_status"`
	ChangedByID    *uuid.UUID `gorm:"type:uuid" json:"changed_by_id,omitempty"`
	Reason         string     `gorm:"type:text" json:"reason,omitempty"`
	ChangedAt      time.Time  `gorm:"not null;index:idx_income_history_changed_at" json:"changed_at"`
	CreatedAt      time.Time  `json:"created_at"`

	// Relationships
	Income    *Income `gorm:"foreignKey:IncomeID" json:"income,omitempty"`
	Member    *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
	ChangedBy *Admin  `gorm:"foreignKey:ChangedByID" json:"changed_by,omitempty"`
}

// TableName specifies the table name for IncomeHistory
func (IncomeHistory) TableName() string {
	return "income_history"
}

// BeforeCreate hook to generate UUID before inserting
func (ih *IncomeHistory) BeforeCreate(tx *gorm.DB) error {
	if ih.ID == uuid.Nil {
		ih.ID = uuid.New()
	}
	if ih.ChangedAt.IsZero() {
		ih.ChangedAt = time.Now()
	}
	return nil
}

// IncomeHistoryResponse represents income history for API responses
type IncomeHistoryResponse struct {
	ID             string    `json:"id"`
	IncomeID       string    `json:"income_id"`
	MemberID       string    `json:"member_id"`
	PreviousStatus *string   `json:"previous_status,omitempty"`
	NewStatus      string    `json:"new_status"`
	ChangedByID    *string   `json:"changed_by_id,omitempty"`
	Reason         string    `json:"reason,omitempty"`
	ChangedAt      time.Time `json:"changed_at"`
	CreatedAt      time.Time `json:"created_at"`
}

// ToResponse converts IncomeHistory to IncomeHistoryResponse
func (ih *IncomeHistory) ToResponse() *IncomeHistoryResponse {
	resp := &IncomeHistoryResponse{
		ID:        ih.ID.String(),
		IncomeID:  ih.IncomeID.String(),
		MemberID:  ih.MemberID.String(),
		NewStatus: ih.NewStatus,
		Reason:    ih.Reason,
		ChangedAt: ih.ChangedAt,
		CreatedAt: ih.CreatedAt,
	}

	if ih.PreviousStatus != nil {
		resp.PreviousStatus = ih.PreviousStatus
	}

	if ih.ChangedByID != nil {
		changedByStr := ih.ChangedByID.String()
		resp.ChangedByID = &changedByStr
	}

	return resp
}

// IncomeCalculationRecord tracks detailed income calculation parameters
type IncomeCalculationRecord struct {
	ID               uuid.UUID              `gorm:"type:uuid;primary_key" json:"id"`
	MemberID         uuid.UUID              `gorm:"type:uuid;not null;index:idx_income_calculations_member_id" json:"member_id"`
	SponsorID        uuid.UUID              `gorm:"type:uuid;not null;index:idx_income_calculations_sponsor_id" json:"sponsor_id"`
	Level            int                    `gorm:"not null;index:idx_income_calculations_level" json:"level"`
	BaseAmount       float64                `gorm:"type:decimal(10,2);not null" json:"base_amount"`
	Percentage       float64                `gorm:"type:decimal(5,2);not null" json:"percentage"`
	CalculatedAmount float64                `gorm:"type:decimal(10,2);not null" json:"calculated_amount"`
	CalculationType  string                 `gorm:"type:varchar(50);not null;index:idx_income_calculations_type" json:"calculation_type"`
	TransactionID    string                 `gorm:"type:varchar(100);uniqueIndex" json:"transaction_id"`
	Metadata         map[string]interface{} `gorm:"type:jsonb" json:"metadata,omitempty"`
	CalculatedAt     time.Time              `gorm:"not null;index:idx_income_calculations_calculated_at" json:"calculated_at"`
	CreatedAt        time.Time              `json:"created_at"`

	// Relationships
	Member  *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
	Sponsor *Member `gorm:"foreignKey:SponsorID;references:ID" json:"sponsor,omitempty"`
}

// TableName specifies the table name for IncomeCalculationRecord
func (IncomeCalculationRecord) TableName() string {
	return "income_calculations"
}

// BeforeCreate hook to generate UUID before inserting
func (ic *IncomeCalculationRecord) BeforeCreate(tx *gorm.DB) error {
	if ic.ID == uuid.Nil {
		ic.ID = uuid.New()
	}
	if ic.CalculatedAt.IsZero() {
		ic.CalculatedAt = time.Now()
	}
	return nil
}

// IncomeCalculationRecordResponse represents income calculation for API responses
type IncomeCalculationRecordResponse struct {
	ID               string                 `json:"id"`
	MemberID         string                 `json:"member_id"`
	SponsorID        string                 `json:"sponsor_id"`
	Level            int                    `json:"level"`
	BaseAmount       float64                `json:"base_amount"`
	Percentage       float64                `json:"percentage"`
	CalculatedAmount float64                `json:"calculated_amount"`
	CalculationType  string                 `json:"calculation_type"`
	TransactionID    string                 `json:"transaction_id"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
	CalculatedAt     time.Time              `json:"calculated_at"`
	CreatedAt        time.Time              `json:"created_at"`
}

// ToResponse converts IncomeCalculationRecord to IncomeCalculationRecordResponse
func (ic *IncomeCalculationRecord) ToResponse() *IncomeCalculationRecordResponse {
	return &IncomeCalculationRecordResponse{
		ID:               ic.ID.String(),
		MemberID:         ic.MemberID.String(),
		SponsorID:        ic.SponsorID.String(),
		Level:            ic.Level,
		BaseAmount:       ic.BaseAmount,
		Percentage:       ic.Percentage,
		CalculatedAmount: ic.CalculatedAmount,
		CalculationType:  ic.CalculationType,
		TransactionID:    ic.TransactionID,
		Metadata:         ic.Metadata,
		CalculatedAt:     ic.CalculatedAt,
		CreatedAt:        ic.CreatedAt,
	}
}

// LevelSnapshot tracks historical seat filling and income per level
type LevelSnapshot struct {
	ID                   uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	MemberID             uuid.UUID `gorm:"type:uuid;not null;index:idx_level_snapshots_member_level" json:"member_id"`
	Level                int       `gorm:"not null" json:"level"`
	SeatFilled           int       `gorm:"not null" json:"seat_filled"`
	SeatCapacity         int       `gorm:"not null" json:"seat_capacity"`
	IncomePotential      float64   `gorm:"type:decimal(10,2);not null" json:"income_potential"`
	IncomeActual         float64   `gorm:"type:decimal(10,2);not null;default:0" json:"income_actual"`
	CompletionPercentage float64   `gorm:"type:decimal(5,2);not null;default:0" json:"completion_percentage"`
	SnapshotDate         time.Time `gorm:"not null;index:idx_level_snapshots_snapshot_date" json:"snapshot_date"`
	CreatedAt            time.Time `json:"created_at"`

	// Relationships
	Member *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
}

// TableName specifies the table name for LevelSnapshot
func (LevelSnapshot) TableName() string {
	return "level_snapshots"
}

// BeforeCreate hook to generate UUID before inserting
func (ls *LevelSnapshot) BeforeCreate(tx *gorm.DB) error {
	if ls.ID == uuid.Nil {
		ls.ID = uuid.New()
	}
	if ls.SnapshotDate.IsZero() {
		ls.SnapshotDate = time.Now()
	}
	return nil
}

// LevelSnapshotResponse represents level snapshot for API responses
type LevelSnapshotResponse struct {
	ID                   string    `json:"id"`
	MemberID             string    `json:"member_id"`
	Level                int       `json:"level"`
	SeatFilled           int       `json:"seat_filled"`
	SeatCapacity         int       `json:"seat_capacity"`
	IncomePotential      float64   `json:"income_potential"`
	IncomeActual         float64   `json:"income_actual"`
	CompletionPercentage float64   `json:"completion_percentage"`
	SnapshotDate         time.Time `json:"snapshot_date"`
	CreatedAt            time.Time `json:"created_at"`
}

// ToResponse converts LevelSnapshot to LevelSnapshotResponse
func (ls *LevelSnapshot) ToResponse() *LevelSnapshotResponse {
	return &LevelSnapshotResponse{
		ID:                   ls.ID.String(),
		MemberID:             ls.MemberID.String(),
		Level:                ls.Level,
		SeatFilled:           ls.SeatFilled,
		SeatCapacity:         ls.SeatCapacity,
		IncomePotential:      ls.IncomePotential,
		IncomeActual:         ls.IncomeActual,
		CompletionPercentage: ls.CompletionPercentage,
		SnapshotDate:         ls.SnapshotDate,
		CreatedAt:            ls.CreatedAt,
	}
}

// IncomeReversal tracks income reversals for adjustments
type IncomeReversal struct {
	ID               uuid.UUID  `gorm:"type:uuid;primary_key" json:"id"`
	OriginalIncomeID uuid.UUID  `gorm:"type:uuid;not null;index:idx_income_reversals_original_id" json:"original_income_id"`
	ReversalIncomeID *uuid.UUID `gorm:"type:uuid" json:"reversal_income_id,omitempty"`
	MemberID         uuid.UUID  `gorm:"type:uuid;not null;index:idx_income_reversals_member_id" json:"member_id"`
	Reason           string     `gorm:"type:text;not null" json:"reason"`
	ReversalAmount   float64    `gorm:"type:decimal(10,2);not null" json:"reversal_amount"`
	ReversedByID     *uuid.UUID `gorm:"type:uuid" json:"reversed_by_id,omitempty"`
	ReversedAt       time.Time  `gorm:"not null;index:idx_income_reversals_reversed_at" json:"reversed_at"`
	CreatedAt        time.Time  `json:"created_at"`

	// Relationships
	OriginalIncome *Income `gorm:"foreignKey:OriginalIncomeID" json:"original_income,omitempty"`
	ReversalIncome *Income `gorm:"foreignKey:ReversalIncomeID" json:"reversal_income,omitempty"`
	Member         *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
	ReversedBy     *Admin  `gorm:"foreignKey:ReversedByID" json:"reversed_by,omitempty"`
}

// TableName specifies the table name for IncomeReversal
func (IncomeReversal) TableName() string {
	return "income_reversals"
}

// BeforeCreate hook to generate UUID before inserting
func (ir *IncomeReversal) BeforeCreate(tx *gorm.DB) error {
	if ir.ID == uuid.Nil {
		ir.ID = uuid.New()
	}
	if ir.ReversedAt.IsZero() {
		ir.ReversedAt = time.Now()
	}
	return nil
}

// IncomeReversalResponse represents income reversal for API responses
type IncomeReversalResponse struct {
	ID               string    `json:"id"`
	OriginalIncomeID string    `json:"original_income_id"`
	ReversalIncomeID *string   `json:"reversal_income_id,omitempty"`
	MemberID         string    `json:"member_id"`
	Reason           string    `json:"reason"`
	ReversalAmount   float64   `json:"reversal_amount"`
	ReversedByID     *string   `json:"reversed_by_id,omitempty"`
	ReversedAt       time.Time `json:"reversed_at"`
	CreatedAt        time.Time `json:"created_at"`
}

// ToResponse converts IncomeReversal to IncomeReversalResponse
func (ir *IncomeReversal) ToResponse() *IncomeReversalResponse {
	resp := &IncomeReversalResponse{
		ID:               ir.ID.String(),
		OriginalIncomeID: ir.OriginalIncomeID.String(),
		MemberID:         ir.MemberID.String(),
		Reason:           ir.Reason,
		ReversalAmount:   ir.ReversalAmount,
		ReversedAt:       ir.ReversedAt,
		CreatedAt:        ir.CreatedAt,
	}

	if ir.ReversalIncomeID != nil {
		reversalStr := ir.ReversalIncomeID.String()
		resp.ReversalIncomeID = &reversalStr
	}

	if ir.ReversedByID != nil {
		reversedByStr := ir.ReversedByID.String()
		resp.ReversedByID = &reversedByStr
	}

	return resp
}
