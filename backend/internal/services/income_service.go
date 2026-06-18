package services

import (
	"fmt"
	"time"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/repositories"
	"mlm-admin-backend/internal/utils"

	"github.com/google/uuid"
)

// IncomeCalculationResult represents the result of income calculation
type IncomeCalculationResult struct {
	IncomeID  string    `json:"income_id"`
	Amount    float64   `json:"amount"`
	Level     int       `json:"level"`
	Status    string    `json:"status"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

// IncomeService handles income business logic
type IncomeService interface {
	// Calculation
	CalculateIncomeForMember(memberID, sponsorID uuid.UUID, level int, transactionType string) (*IncomeCalculationResult, error)
	CalculateDownlineIncome(memberID uuid.UUID) (map[int]float64, float64, error)
	RecalculateAllIncomes(memberID uuid.UUID) error

	// Retrieval
	GetMemberIncomeHistory(memberID uuid.UUID, page, limit int) (interface{}, int64, error)
	GetMemberTotalIncome(memberID uuid.UUID) (float64, error)
	GetIncomeProjection(memberID uuid.UUID) (interface{}, error)
	GetIncomeByLevel(level int, page, limit int) (interface{}, int64, error)

	// Commission Config
	GetCommissionConfig() (interface{}, error)
	UpdateCommissionConfig(level int, input *UpdateCommissionConfigInput) (interface{}, error)
	ValidateCommissionStructure() error

	// Snapshots & History
	CreateLevelSnapshot(memberID uuid.UUID, level int) error
	GetLevelSnapshotHistory(memberID uuid.UUID, level int) (interface{}, error)

	// Status & Reversals
	ReverseIncome(incomeID uuid.UUID, reason string, adminID *uuid.UUID) error
	UpdateIncomeStatus(incomeID uuid.UUID, newStatus, reason string, adminID *uuid.UUID) error
}

type incomeService struct {
	incomeRepo     repositories.IncomeRepository
	commissionRepo repositories.CommissionRepository
	memberRepo     repositories.MemberRepository
	referralRepo   repositories.ReferralRepository
	config         *config.Config
	logger         *utils.Logger
	calculator     *utils.IncomeCalculator
}

// NewIncomeService creates a new income service
func NewIncomeService(
	incomeRepo repositories.IncomeRepository,
	commissionRepo repositories.CommissionRepository,
	memberRepo repositories.MemberRepository,
	referralRepo repositories.ReferralRepository,
	cfg *config.Config,
	logger *utils.Logger,
) (IncomeService, error) {
	// Get commission configurations
	configs, err := commissionRepo.GetActive()
	if err != nil {
		return nil, fmt.Errorf("failed to load commission configurations: %w", err)
	}

	// Convert to calculator configs
	calcConfigs := make([]*utils.MLMLevelConfig, 0)
	for _, cfg := range configs {
		calcConfigs = append(calcConfigs, &utils.MLMLevelConfig{
			Level:                cfg.Level,
			IncomeAmount:         cfg.IncomeAmount,
			SeatCapacity:         cfg.SeatCapacity,
			CommissionPercentage: cfg.CommissionPercentage,
		})
	}

	calculator := utils.NewIncomeCalculator(calcConfigs)

	// Validate all levels are configured
	if err := calculator.ValidateAllLevelsConfigured(); err != nil {
		return nil, fmt.Errorf("commission configuration incomplete: %w", err)
	}

	return &incomeService{
		incomeRepo:     incomeRepo,
		commissionRepo: commissionRepo,
		memberRepo:     memberRepo,
		referralRepo:   referralRepo,
		config:         cfg,
		logger:         logger,
		calculator:     calculator,
	}, nil
}

// CalculateIncomeForMember calculates income for a member from a sponsor
func (s *incomeService) CalculateIncomeForMember(memberID, sponsorID uuid.UUID, level int, transactionType string) (*IncomeCalculationResult, error) {
	result := &IncomeCalculationResult{
		Status:    "pending",
		Level:     level,
		CreatedAt: time.Now(),
	}

	// Validate level
	if level < 1 || level > 10 {
		result.Message = fmt.Sprintf("invalid level: %d", level)
		return result, nil
	}

	// Check if member exists and is active
	member, err := s.memberRepo.GetByID(memberID)
	if err != nil {
		result.Message = fmt.Sprintf("member lookup failed: %v", err)
		return result, err
	}
	if member == nil {
		result.Message = "member not found"
		return result, nil
	}
	if member.Status != "active" {
		result.Message = fmt.Sprintf("member is not active: %s", member.Status)
		return result, nil
	}

	// Check if sponsor exists and is active
	sponsor, err := s.memberRepo.GetByID(sponsorID)
	if err != nil {
		result.Message = fmt.Sprintf("sponsor lookup failed: %v", err)
		return result, err
	}
	if sponsor == nil {
		result.Message = "sponsor not found"
		return result, nil
	}
	if sponsor.Status != "active" {
		result.Message = fmt.Sprintf("sponsor is not active: %s", sponsor.Status)
		return result, nil
	}

	// Prevent self-sponsorship
	if memberID == sponsorID {
		result.Message = "member cannot be their own sponsor"
		return result, nil
	}

	// Check for circular reference in the upline
	isCircular, err := s.memberRepo.CheckCircularReference(sponsorID, memberID)
	if err != nil {
		result.Message = fmt.Sprintf("circular reference check failed: %v", err)
		return result, err
	}
	if isCircular {
		result.Message = "circular reference detected in upline"
		return result, nil
	}

	// Get commission config for the level
	commConfig, err := s.commissionRepo.GetByLevel(level)
	if err != nil {
		result.Message = fmt.Sprintf("commission config lookup failed: %v", err)
		return result, err
	}
	if commConfig == nil {
		result.Message = fmt.Sprintf("commission config not found for level %d", level)
		return result, nil
	}

	// Generate unique transaction ID
	transactionID := fmt.Sprintf("%s_%d_%d", memberID.String()[:8], level, time.Now().UnixNano())

	// Check for duplicate transaction
	existingCalc, err := s.incomeRepo.GetCalculationByTransactionID(transactionID)
	if err != nil {
		result.Message = fmt.Sprintf("transaction check failed: %v", err)
		return result, err
	}
	if existingCalc != nil {
		result.Message = "transaction already processed"
		return result, nil
	}

	// Calculate income
	params := utils.IncomeCalculationParams{
		Level:             level,
		MemberSeatsFilled: 1, // Base calculation for one new referral
		SeatCapacity:      commConfig.SeatCapacity,
		BaseAmount:        commConfig.IncomeAmount,
		CommissionPercent: commConfig.CommissionPercentage,
	}

	incomeAmount, err := s.calculator.CalculateIncomeForLevel(params)
	if err != nil {
		result.Message = fmt.Sprintf("income calculation failed: %v", err)
		return result, err
	}

	// Create income record in transaction
	income := &models.Income{
		MemberID:      memberID,
		FromMemberID:  sponsorID,
		Level:         level,
		Amount:        incomeAmount,
		Percentage:    commConfig.CommissionPercentage,
		TransactionID: transactionID,
		Status:        "completed",
		Description:   fmt.Sprintf("Income from %s registration/referral at level %d", transactionType, level),
		ProcessedAt:   time.Now(),
	}

	if err := s.incomeRepo.Create(income); err != nil {
		result.Message = fmt.Sprintf("failed to save income record: %v", err)
		return result, err
	}

	// Create calculation record for audit
	calculation := &models.IncomeCalculationRecord{
		MemberID:         memberID,
		SponsorID:        sponsorID,
		Level:            level,
		BaseAmount:       commConfig.IncomeAmount,
		Percentage:       commConfig.CommissionPercentage,
		CalculatedAmount: incomeAmount,
		CalculationType:  transactionType,
		TransactionID:    transactionID,
		Metadata: map[string]interface{}{
			"seat_capacity": commConfig.SeatCapacity,
			"timestamp":     time.Now().Unix(),
		},
	}

	if err := s.incomeRepo.CreateCalculation(calculation); err != nil {
		s.logger.Error(err, "Failed to create calculation record", map[string]interface{}{
			"income_id": income.ID,
		})
		// Non-fatal - continue
	}

	// Create snapshot
	if err := s.createLevelSnapshotInternal(memberID, level); err != nil {
		s.logger.Error(err, "Failed to create level snapshot", map[string]interface{}{
			"member_id": memberID,
			"level":     level,
		})
		// Non-fatal - continue
	}

	result.IncomeID = income.ID.String()
	result.Amount = incomeAmount
	result.Status = "completed"
	result.Message = fmt.Sprintf("Income calculated successfully: Rs. %v", incomeAmount)

	s.logger.Info("Income calculated", map[string]interface{}{
		"income_id": income.ID,
		"amount":    incomeAmount,
		"level":     level,
		"member_id": memberID,
	})

	return result, nil
}

// CalculateDownlineIncome calculates total income from all downlines for a member
func (s *incomeService) CalculateDownlineIncome(memberID uuid.UUID) (map[int]float64, float64, error) {
	levelIncomes := make(map[int]float64)
	totalIncome := 0.0

	// Get all completed income records for this member
	for level := 1; level <= 10; level++ {
		incomes, _, err := s.incomeRepo.GetByMemberIDAndLevel(memberID, level, 1, 1000)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get income records for level %d: %w", level, err)
		}

		levelTotal := 0.0
		for _, income := range incomes {
			if income.Status == "completed" {
				levelTotal += income.Amount
			}
		}
		levelIncomes[level] = levelTotal
		totalIncome += levelTotal
	}

	return levelIncomes, totalIncome, nil
}

// RecalculateAllIncomes recalculates all income records for a member (for admin use)
func (s *incomeService) RecalculateAllIncomes(memberID uuid.UUID) error {
	// Get all pending income records
	pendingIncomes, _, err := s.incomeRepo.GetByStatus("pending", 1, 1000)
	if err != nil {
		return fmt.Errorf("failed to get pending income records: %w", err)
	}

	// Filter for member
	for _, income := range pendingIncomes {
		if income.MemberID == memberID {
			// Validate and mark as completed if valid
			if income.Amount > 0 && income.Level > 0 {
				income.Status = "completed"
				if err := s.incomeRepo.Update(income); err != nil {
					return fmt.Errorf("failed to update income record: %w", err)
				}
			}
		}
	}

	return nil
}

// GetMemberIncomeHistory retrieves income history for a member
func (s *incomeService) GetMemberIncomeHistory(memberID uuid.UUID, page, limit int) (interface{}, int64, error) {
	incomes, total, err := s.incomeRepo.GetByMemberID(memberID, page, limit)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]*models.IncomeResponse, 0)
	for _, income := range incomes {
		responses = append(responses, income.ToResponse())
	}

	return responses, total, nil
}

// GetMemberTotalIncome gets total income for a member
func (s *incomeService) GetMemberTotalIncome(memberID uuid.UUID) (float64, error) {
	return s.incomeRepo.GetCompletedIncomeByMember(memberID)
}

// GetIncomeProjection gets projected income for a member
func (s *incomeService) GetIncomeProjection(memberID uuid.UUID) (interface{}, error) {
	levelIncomes, total, err := s.CalculateDownlineIncome(memberID)
	if err != nil {
		return nil, err
	}

	maxPossible, maxPerLevel, err := s.calculator.CalculateMaxPossibleIncome()
	if err != nil {
		return nil, err
	}

	projection := map[string]interface{}{
		"member_id":             memberID.String(),
		"actual_total":          total,
		"potential_total":       maxPossible,
		"completion_percentage": (total / maxPossible) * 100,
		"by_level":              levelIncomes,
		"max_possible_by_level": maxPerLevel,
	}

	return projection, nil
}

// GetIncomeByLevel gets income records for a specific level
func (s *incomeService) GetIncomeByLevel(level int, page, limit int) (interface{}, int64, error) {
	incomes, total, err := s.incomeRepo.GetIncomeByLevel(level, page, limit)
	if err != nil {
		return nil, 0, err
	}

	responses := make([]*models.IncomeResponse, 0)
	for _, income := range incomes {
		responses = append(responses, income.ToResponse())
	}

	return responses, total, nil
}

// GetCommissionConfig retrieves all commission configurations
func (s *incomeService) GetCommissionConfig() (interface{}, error) {
	configs, err := s.commissionRepo.GetAll()
	if err != nil {
		return nil, err
	}

	responses := make([]*models.CommissionResponse, 0)
	for _, config := range configs {
		responses = append(responses, config.ToResponse())
	}

	return responses, nil
}

// UpdateCommissionConfigInput represents input for updating commission config
type UpdateCommissionConfigInput struct {
	IncomeAmount         *float64 `json:"income_amount,omitempty"`
	SeatCapacity         *int     `json:"seat_capacity,omitempty"`
	CommissionPercentage *float64 `json:"commission_percentage,omitempty"`
	IsActive             *bool    `json:"is_active,omitempty"`
}

// UpdateCommissionConfig updates a commission configuration
func (s *incomeService) UpdateCommissionConfig(level int, input *UpdateCommissionConfigInput) (interface{}, error) {
	config, err := s.commissionRepo.GetByLevel(level)
	if err != nil {
		return nil, err
	}
	if config == nil {
		return nil, fmt.Errorf("commission config not found for level %d", level)
	}

	// Update fields
	if input.IncomeAmount != nil {
		config.IncomeAmount = *input.IncomeAmount
	}
	if input.SeatCapacity != nil {
		config.SeatCapacity = *input.SeatCapacity
	}
	if input.CommissionPercentage != nil {
		config.CommissionPercentage = *input.CommissionPercentage
	}
	if input.IsActive != nil {
		config.IsActive = *input.IsActive
	}

	if err := s.commissionRepo.Update(config); err != nil {
		return nil, fmt.Errorf("failed to update commission config: %w", err)
	}

	s.logger.Info("Commission config updated", map[string]interface{}{
		"level":  level,
		"config": config,
	})

	return config.ToResponse(), nil
}

// ValidateCommissionStructure validates if all levels are properly configured
func (s *incomeService) ValidateCommissionStructure() error {
	return s.commissionRepo.ValidateAllLevelsConfigured()
}

// createLevelSnapshotInternal creates a level snapshot (internal use)
func (s *incomeService) createLevelSnapshotInternal(memberID uuid.UUID, level int) error {
	config, err := s.commissionRepo.GetByLevel(level)
	if err != nil {
		return err
	}
	if config == nil {
		return fmt.Errorf("commission config not found for level %d", level)
	}

	// Get current income for this level
	incomes, _, err := s.incomeRepo.GetByMemberIDAndLevel(memberID, level, 1, 1000)
	if err != nil {
		return err
	}

	totalIncome := 0.0
	for _, income := range incomes {
		if income.Status == "completed" {
			totalIncome += income.Amount
		}
	}

	// Calculate metrics
	seatsFilled := len(incomes)
	completionPercentage, _ := s.calculator.CalculateCompletionPercentage(level, seatsFilled)
	potential, _ := s.calculator.CalculatePotentialIncome(level)

	snapshot := &models.LevelSnapshot{
		MemberID:             memberID,
		Level:                level,
		SeatFilled:           seatsFilled,
		SeatCapacity:         config.SeatCapacity,
		IncomePotential:      potential,
		IncomeActual:         totalIncome,
		CompletionPercentage: completionPercentage,
		SnapshotDate:         time.Now(),
	}

	return s.incomeRepo.CreateSnapshot(snapshot)
}

// CreateLevelSnapshot creates a level snapshot
func (s *incomeService) CreateLevelSnapshot(memberID uuid.UUID, level int) error {
	return s.createLevelSnapshotInternal(memberID, level)
}

// GetLevelSnapshotHistory gets historical snapshots for a level
func (s *incomeService) GetLevelSnapshotHistory(memberID uuid.UUID, level int) (interface{}, error) {
	snapshots, err := s.incomeRepo.GetSnapshotHistory(memberID, level)
	if err != nil {
		return nil, err
	}

	responses := make([]*models.LevelSnapshotResponse, 0)
	for _, snapshot := range snapshots {
		responses = append(responses, snapshot.ToResponse())
	}

	return responses, nil
}

// ReverseIncome reverses a previously processed income
func (s *incomeService) ReverseIncome(incomeID uuid.UUID, reason string, adminID *uuid.UUID) error {
	income, err := s.incomeRepo.GetByID(incomeID)
	if err != nil {
		return fmt.Errorf("failed to get income record: %w", err)
	}
	if income == nil {
		return fmt.Errorf("income not found: %s", incomeID)
	}

	if income.Status == "reversed" {
		return fmt.Errorf("income already reversed")
	}

	// Create reversal income record
	reversalIncome := &models.Income{
		MemberID:      income.MemberID,
		FromMemberID:  income.FromMemberID,
		Level:         income.Level,
		Amount:        -income.Amount, // Negative amount
		Percentage:    income.Percentage,
		TransactionID: fmt.Sprintf("%s_reversal_%d", income.TransactionID, time.Now().UnixNano()),
		Status:        "completed",
		Description:   fmt.Sprintf("Reversal of income ID: %s. Reason: %s", incomeID, reason),
		ProcessedAt:   time.Now(),
	}

	if err := s.incomeRepo.Create(reversalIncome); err != nil {
		return fmt.Errorf("failed to create reversal income record: %w", err)
	}

	// Update original income status
	if err := s.incomeRepo.UpdateStatus(incomeID, "reversed", reason, adminID); err != nil {
		return fmt.Errorf("failed to update original income status: %w", err)
	}

	// Create reversal tracking record
	reversal := &models.IncomeReversal{
		OriginalIncomeID: incomeID,
		ReversalIncomeID: &reversalIncome.ID,
		MemberID:         income.MemberID,
		Reason:           reason,
		ReversalAmount:   income.Amount,
		ReversedByID:     adminID,
		ReversedAt:       time.Now(),
	}

	if err := s.incomeRepo.CreateReversal(reversal); err != nil {
		return fmt.Errorf("failed to create reversal record: %w", err)
	}

	s.logger.Info("Income reversed", map[string]interface{}{
		"original_income_id": incomeID,
		"reversal_income_id": reversalIncome.ID,
		"reason":             reason,
	})

	return nil
}

// UpdateIncomeStatus updates the status of an income record
func (s *incomeService) UpdateIncomeStatus(incomeID uuid.UUID, newStatus, reason string, adminID *uuid.UUID) error {
	// Validate new status
	validStatuses := map[string]bool{
		"pending":   true,
		"completed": true,
		"failed":    true,
		"reversed":  true,
	}

	if !validStatuses[newStatus] {
		return fmt.Errorf("invalid status: %s", newStatus)
	}

	return s.incomeRepo.UpdateStatus(incomeID, newStatus, reason, adminID)
}
