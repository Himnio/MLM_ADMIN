package repositories

import (
	"errors"
	"fmt"
	"time"

	"mlm-admin-backend/internal/database"
	"mlm-admin-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// IncomeRepository handles database operations for income
type IncomeRepository interface {
	// Income CRUD
	Create(income *models.Income) error
	GetByID(id uuid.UUID) (*models.Income, error)
	GetByTransactionID(transactionID string) (*models.Income, error)
	Update(income *models.Income) error
	Delete(id uuid.UUID) error
	List(page, limit int) ([]*models.Income, int64, error)

	// Member income queries
	GetByMemberID(memberID uuid.UUID, page, limit int) ([]*models.Income, int64, error)
	GetByMemberIDAndLevel(memberID uuid.UUID, level int, page, limit int) ([]*models.Income, int64, error)
	GetTotalIncomeByMember(memberID uuid.UUID) (float64, error)
	GetCompletedIncomeByMember(memberID uuid.UUID) (float64, error)

	// Level-based queries
	GetIncomeByLevel(level int, page, limit int) ([]*models.Income, int64, error)
	GetTotalIncomeByLevel(level int) (float64, error)
	GetMembersEarningAtLevel(level int) (int64, error)

	// Historical queries
	GetIncomeHistory(memberID uuid.UUID, page, limit int) ([]*models.IncomeHistory, int64, error)
	AddHistory(history *models.IncomeHistory) error

	// Calculation tracking
	CreateCalculation(calc *models.IncomeCalculationRecord) error
	GetCalculationByTransactionID(transactionID string) (*models.IncomeCalculationRecord, error)
	GetCalculationsByMember(memberID uuid.UUID, page, limit int) ([]*models.IncomeCalculationRecord, int64, error)

	// Snapshots
	CreateSnapshot(snapshot *models.LevelSnapshot) error
	GetLatestSnapshot(memberID uuid.UUID, level int) (*models.LevelSnapshot, error)
	GetSnapshotHistory(memberID uuid.UUID, level int) ([]*models.LevelSnapshot, error)

	// Reversals
	CreateReversal(reversal *models.IncomeReversal) error
	GetReversalsByMember(memberID uuid.UUID) ([]*models.IncomeReversal, error)

	// Status updates
	UpdateStatus(id uuid.UUID, newStatus, reason string, adminID *uuid.UUID) error
	GetByStatus(status string, page, limit int) ([]*models.Income, int64, error)

	// Date range queries
	GetIncomeByDateRange(startDate, endDate time.Time, page, limit int) ([]*models.Income, int64, error)
	GetIncomeByMemberAndDateRange(memberID uuid.UUID, startDate, endDate time.Time, page, limit int) ([]*models.Income, int64, error)
}

type incomeRepository struct {
	db *database.PostgresDB
}

// NewIncomeRepository creates a new income repository
func NewIncomeRepository(db *database.PostgresDB) IncomeRepository {
	return &incomeRepository{db: db}
}

// Create creates a new income record
func (r *incomeRepository) Create(income *models.Income) error {
	return r.db.DB.Create(income).Error
}

// GetByID retrieves an income record by ID
func (r *incomeRepository) GetByID(id uuid.UUID) (*models.Income, error) {
	var income models.Income
	err := r.db.DB.Where("id = ?", id).First(&income).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &income, nil
}

// GetByTransactionID retrieves an income record by transaction ID
func (r *incomeRepository) GetByTransactionID(transactionID string) (*models.Income, error) {
	var income models.Income
	err := r.db.DB.Where("transaction_id = ?", transactionID).First(&income).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &income, nil
}

// Update updates an income record
func (r *incomeRepository) Update(income *models.Income) error {
	return r.db.DB.Save(income).Error
}

// Delete deletes an income record
func (r *incomeRepository) Delete(id uuid.UUID) error {
	return r.db.DB.Where("id = ?", id).Delete(&models.Income{}).Error
}

// List lists all income records with pagination
func (r *incomeRepository) List(page, limit int) ([]*models.Income, int64, error) {
	var incomes []*models.Income
	var total int64

	err := r.db.DB.Model(&models.Income{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = r.db.DB.
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&incomes).Error

	return incomes, total, err
}

// GetByMemberID retrieves income records by member ID with pagination
func (r *incomeRepository) GetByMemberID(memberID uuid.UUID, page, limit int) ([]*models.Income, int64, error) {
	var incomes []*models.Income
	var total int64

	err := r.db.DB.Where("member_id = ?", memberID).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = r.db.DB.
		Where("member_id = ?", memberID).
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&incomes).Error

	return incomes, total, err
}

// GetByMemberIDAndLevel retrieves income records by member ID and level
func (r *incomeRepository) GetByMemberIDAndLevel(memberID uuid.UUID, level int, page, limit int) ([]*models.Income, int64, error) {
	var incomes []*models.Income
	var total int64

	err := r.db.DB.Where("member_id = ? AND level = ?", memberID, level).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = r.db.DB.
		Where("member_id = ? AND level = ?", memberID, level).
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&incomes).Error

	return incomes, total, err
}

// GetTotalIncomeByMember calculates total income for a member
func (r *incomeRepository) GetTotalIncomeByMember(memberID uuid.UUID) (float64, error) {
	var total float64
	err := r.db.DB.
		Model(&models.Income{}).
		Where("member_id = ?", memberID).
		Select("COALESCE(SUM(amount), 0)").
		Row().
		Scan(&total)

	return total, err
}

// GetCompletedIncomeByMember calculates completed income for a member
func (r *incomeRepository) GetCompletedIncomeByMember(memberID uuid.UUID) (float64, error) {
	var total float64
	err := r.db.DB.
		Model(&models.Income{}).
		Where("member_id = ? AND status = ?", memberID, "completed").
		Select("COALESCE(SUM(amount), 0)").
		Row().
		Scan(&total)

	return total, err
}

// GetIncomeByLevel retrieves income records by level
func (r *incomeRepository) GetIncomeByLevel(level int, page, limit int) ([]*models.Income, int64, error) {
	var incomes []*models.Income
	var total int64

	err := r.db.DB.Where("level = ?", level).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = r.db.DB.
		Where("level = ?", level).
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&incomes).Error

	return incomes, total, err
}

// GetTotalIncomeByLevel calculates total income for a level
func (r *incomeRepository) GetTotalIncomeByLevel(level int) (float64, error) {
	var total float64
	err := r.db.DB.
		Model(&models.Income{}).
		Where("level = ? AND status = ?", level, "completed").
		Select("COALESCE(SUM(amount), 0)").
		Row().
		Scan(&total)

	return total, err
}

// GetMembersEarningAtLevel counts unique members earning at a level
func (r *incomeRepository) GetMembersEarningAtLevel(level int) (int64, error) {
	var count int64
	err := r.db.DB.
		Model(&models.Income{}).
		Distinct("member_id").
		Where("level = ? AND status = ?", level, "completed").
		Count(&count).Error

	return count, err
}

// GetIncomeHistory retrieves income history for a member
func (r *incomeRepository) GetIncomeHistory(memberID uuid.UUID, page, limit int) ([]*models.IncomeHistory, int64, error) {
	var histories []*models.IncomeHistory
	var total int64

	err := r.db.DB.Where("member_id = ?", memberID).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = r.db.DB.
		Where("member_id = ?", memberID).
		Offset(offset).
		Limit(limit).
		Order("changed_at DESC").
		Find(&histories).Error

	return histories, total, err
}

// AddHistory adds a new income history record
func (r *incomeRepository) AddHistory(history *models.IncomeHistory) error {
	return r.db.DB.Create(history).Error
}

// CreateCalculation creates a new income calculation record
func (r *incomeRepository) CreateCalculation(calc *models.IncomeCalculationRecord) error {
	return r.db.DB.Create(calc).Error
}

// GetCalculationByTransactionID retrieves calculation by transaction ID
func (r *incomeRepository) GetCalculationByTransactionID(transactionID string) (*models.IncomeCalculationRecord, error) {
	var calc models.IncomeCalculationRecord
	err := r.db.DB.Where("transaction_id = ?", transactionID).First(&calc).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &calc, nil
}

// GetCalculationsByMember retrieves calculations by member ID
func (r *incomeRepository) GetCalculationsByMember(memberID uuid.UUID, page, limit int) ([]*models.IncomeCalculationRecord, int64, error) {
	var calcs []*models.IncomeCalculationRecord
	var total int64

	err := r.db.DB.Where("member_id = ?", memberID).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = r.db.DB.
		Where("member_id = ?", memberID).
		Offset(offset).
		Limit(limit).
		Order("calculated_at DESC").
		Find(&calcs).Error

	return calcs, total, err
}

// CreateSnapshot creates a new level snapshot
func (r *incomeRepository) CreateSnapshot(snapshot *models.LevelSnapshot) error {
	return r.db.DB.Create(snapshot).Error
}

// GetLatestSnapshot retrieves the latest snapshot for a member and level
func (r *incomeRepository) GetLatestSnapshot(memberID uuid.UUID, level int) (*models.LevelSnapshot, error) {
	var snapshot models.LevelSnapshot
	err := r.db.DB.
		Where("member_id = ? AND level = ?", memberID, level).
		Order("snapshot_date DESC").
		First(&snapshot).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &snapshot, nil
}

// GetSnapshotHistory retrieves historical snapshots for a member and level
func (r *incomeRepository) GetSnapshotHistory(memberID uuid.UUID, level int) ([]*models.LevelSnapshot, error) {
	var snapshots []*models.LevelSnapshot
	err := r.db.DB.
		Where("member_id = ? AND level = ?", memberID, level).
		Order("snapshot_date DESC").
		Find(&snapshots).Error

	return snapshots, err
}

// CreateReversal creates a new income reversal record
func (r *incomeRepository) CreateReversal(reversal *models.IncomeReversal) error {
	return r.db.DB.Create(reversal).Error
}

// GetReversalsByMember retrieves all reversals for a member
func (r *incomeRepository) GetReversalsByMember(memberID uuid.UUID) ([]*models.IncomeReversal, error) {
	var reversals []*models.IncomeReversal
	err := r.db.DB.
		Where("member_id = ?", memberID).
		Order("reversed_at DESC").
		Find(&reversals).Error

	return reversals, err
}

// UpdateStatus updates income status and logs the change
func (r *incomeRepository) UpdateStatus(id uuid.UUID, newStatus, reason string, adminID *uuid.UUID) error {
	var income models.Income
	err := r.db.DB.Where("id = ?", id).First(&income).Error
	if err != nil {
		return err
	}

	// Use transaction for atomicity
	tx := r.db.DB.Begin()

	// Update status
	if err := tx.Model(&income).Update("status", newStatus).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Log history
	history := &models.IncomeHistory{
		IncomeID:       id,
		MemberID:       income.MemberID,
		PreviousStatus: &income.Status,
		NewStatus:      newStatus,
		ChangedByID:    adminID,
		Reason:         reason,
		ChangedAt:      time.Now(),
	}

	if err := tx.Create(history).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// GetByStatus retrieves income records by status
func (r *incomeRepository) GetByStatus(status string, page, limit int) ([]*models.Income, int64, error) {
	var incomes []*models.Income
	var total int64

	err := r.db.DB.Where("status = ?", status).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = r.db.DB.
		Where("status = ?", status).
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&incomes).Error

	return incomes, total, err
}

// GetIncomeByDateRange retrieves income records within a date range
func (r *incomeRepository) GetIncomeByDateRange(startDate, endDate time.Time, page, limit int) ([]*models.Income, int64, error) {
	var incomes []*models.Income
	var total int64

	err := r.db.DB.
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = r.db.DB.
		Where("created_at BETWEEN ? AND ?", startDate, endDate).
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&incomes).Error

	return incomes, total, err
}

// GetIncomeByMemberAndDateRange retrieves income records for a member within a date range
func (r *incomeRepository) GetIncomeByMemberAndDateRange(memberID uuid.UUID, startDate, endDate time.Time, page, limit int) ([]*models.Income, int64, error) {
	var incomes []*models.Income
	var total int64

	err := r.db.DB.
		Where("member_id = ? AND created_at BETWEEN ? AND ?", memberID, startDate, endDate).
		Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err = r.db.DB.
		Where("member_id = ? AND created_at BETWEEN ? AND ?", memberID, startDate, endDate).
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&incomes).Error

	return incomes, total, err
}

// CommissionRepository handles database operations for commission configurations
type CommissionRepository interface {
	GetAll() ([]*models.CommissionConfig, error)
	GetByLevel(level int) (*models.CommissionConfig, error)
	Update(config *models.CommissionConfig) error
	GetActive() ([]*models.CommissionConfig, error)
	ValidateAllLevelsConfigured() error
}

type commissionRepository struct {
	db *database.PostgresDB
}

// NewCommissionRepository creates a new commission repository
func NewCommissionRepository(db *database.PostgresDB) CommissionRepository {
	return &commissionRepository{db: db}
}

// GetAll retrieves all commission configurations
func (r *commissionRepository) GetAll() ([]*models.CommissionConfig, error) {
	var configs []*models.CommissionConfig
	err := r.db.DB.Order("level").Find(&configs).Error
	return configs, err
}

// GetByLevel retrieves commission configuration for a specific level
func (r *commissionRepository) GetByLevel(level int) (*models.CommissionConfig, error) {
	if level < 1 || level > 10 {
		return nil, fmt.Errorf("invalid level: %d, must be between 1-10", level)
	}

	var config models.CommissionConfig
	err := r.db.DB.Where("level = ?", level).First(&config).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &config, nil
}

// Update updates a commission configuration
func (r *commissionRepository) Update(config *models.CommissionConfig) error {
	return r.db.DB.Save(config).Error
}

// GetActive retrieves active commission configurations
func (r *commissionRepository) GetActive() ([]*models.CommissionConfig, error) {
	var configs []*models.CommissionConfig
	err := r.db.DB.Where("is_active = ?", true).Order("level").Find(&configs).Error
	return configs, err
}

// ValidateAllLevelsConfigured checks if all 10 levels are configured
func (r *commissionRepository) ValidateAllLevelsConfigured() error {
	var count int64
	err := r.db.DB.Model(&models.CommissionConfig{}).Where("is_active = ?", true).Count(&count).Error
	if err != nil {
		return err
	}

	if count < 10 {
		return fmt.Errorf("not all 10 levels are configured: only %d levels found", count)
	}

	return nil
}
