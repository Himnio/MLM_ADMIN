package repositories

import (
	"errors"
	"time"

	"mlm-admin-backend/internal/database"
	"mlm-admin-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ReferralRepository handles database operations for MLM referral system
type ReferralRepository interface {
	// Commission configs
	GetCommissionConfigByLevel(level int) (*models.CommissionConfig, error)
	GetAllCommissionConfigs() ([]*models.CommissionConfig, error)
	UpdateCommissionConfig(config *models.CommissionConfig) error

	// Income projections
	GetIncomeProjectionByMemberAndLevel(memberID uuid.UUID, level int) (*models.IncomeProjection, error)
	GetIncomeProjectionsByMember(memberID uuid.UUID) ([]*models.IncomeProjection, error)
	CreateIncomeProjection(projection *models.IncomeProjection) error
	UpdateIncomeProjection(projection *models.IncomeProjection) error

	// Referral tracking
	GetDirectReferralsCount(memberID uuid.UUID) (int, error)
	GetReferralsByLevel(memberID uuid.UUID, level int) (int, error)
	UpdateReferralCount(memberID uuid.UUID, level int, increment int) error

	// Income calculation
	CalculatePotentialIncome(memberID uuid.UUID) ([]*models.IncomeProjection, error)
	CalculateActualIncome(memberID uuid.UUID, level int, referredMembers []uuid.UUID) (float64, error)
	CalculateTotalIncome(memberID uuid.UUID) (float64, error)

	// Tree operations
	GetDownlineWithLevels(memberID uuid.UUID, maxLevel int) ([]*models.MemberWithLevel, error)
	GetUplineWithLevels(memberID uuid.UUID, maxLevel int) ([]*models.MemberWithLevel, error)
}

type referralRepository struct {
	db *database.PostgresDB
}

// NewReferralRepository creates a new referral repository
func NewReferralRepository(db *database.PostgresDB) ReferralRepository {
	return &referralRepository{db: db}
}

// GetCommissionConfigByLevel retrieves commission config for a specific level
func (r *referralRepository) GetCommissionConfigByLevel(level int) (*models.CommissionConfig, error) {
	var config models.CommissionConfig
	err := r.db.DB.Where("level = ? AND is_active = true", level).First(&config).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &config, nil
}

// GetAllCommissionConfigs retrieves all active commission configs ordered by level
func (r *referralRepository) GetAllCommissionConfigs() ([]*models.CommissionConfig, error) {
	var configs []*models.CommissionConfig
	err := r.db.DB.Where("is_active = true").Order("level asc").Find(&configs).Error
	return configs, err
}

// UpdateCommissionConfig updates a commission configuration
func (r *referralRepository) UpdateCommissionConfig(config *models.CommissionConfig) error {
	return r.db.DB.Save(config).Error
}

// GetIncomeProjectionByMemberAndLevel gets projection for a member at a specific level
func (r *referralRepository) GetIncomeProjectionByMemberAndLevel(memberID uuid.UUID, level int) (*models.IncomeProjection, error) {
	var projection models.IncomeProjection
	err := r.db.DB.Where("member_id = ? AND level = ?", memberID, level).First(&projection).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &projection, nil
}

// GetIncomeProjectionsByMember gets all income projections for a member
func (r *referralRepository) GetIncomeProjectionsByMember(memberID uuid.UUID) ([]*models.IncomeProjection, error) {
	var projections []*models.IncomeProjection
	err := r.db.DB.Where("member_id = ?", memberID).Order("level asc").Find(&projections).Error
	return projections, err
}

// CreateIncomeProjection creates a new income projection record
func (r *referralRepository) CreateIncomeProjection(projection *models.IncomeProjection) error {
	return r.db.DB.Create(projection).Error
}

// UpdateIncomeProjection updates an existing income projection
func (r *referralRepository) UpdateIncomeProjection(projection *models.IncomeProjection) error {
	return r.db.DB.Save(projection).Error
}

// GetDirectReferralsCount gets count of direct referrals for a member
func (r *referralRepository) GetDirectReferralsCount(memberID uuid.UUID) (int, error) {
	var count int64
	err := r.db.DB.Model(&models.Member{}).
		Where("sponsor_id = ?", memberID).
		Count(&count).Error
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

// GetReferralsByLevel gets count of referrals at a specific level
func (r *referralRepository) GetReferralsByLevel(memberID uuid.UUID, level int) (int, error) {
	if level < 1 {
		return 0, nil
	}
	if level == 1 {
		return r.GetDirectReferralsCount(memberID)
	}

	// For levels > 1, count referrals at that depth in the tree
	var count int64
	query := `
		WITH RECURSIVE referral_tree AS (
			SELECT id, sponsor_id, 1 as depth
			FROM members
			WHERE sponsor_id = ? AND deleted_at IS NULL
			UNION ALL
			SELECT m.id, m.sponsor_id, rt.depth + 1
			FROM members m
			INNER JOIN referral_tree rt ON m.sponsor_id = rt.id
			WHERE m.deleted_at IS NULL
		)
		SELECT COUNT(*) FROM referral_tree WHERE depth = ?
	`

	err := r.db.DB.Raw(query, memberID, level).Scan(&count).Error
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

// UpdateReferralCount increments/decrements referral count for a member at a level
func (r *referralRepository) UpdateReferralCount(memberID uuid.UUID, level int, increment int) error {
	// Get or create projection
	projection, err := r.GetIncomeProjectionByMemberAndLevel(memberID, level)
	if err != nil {
		return err
	}

	if projection == nil {
		// Create new projection
		config, err := r.GetCommissionConfigByLevel(level)
		if err != nil {
			return err
		}
		if config == nil {
			return errors.New("commission config not found for level")
		}

		projection = &models.IncomeProjection{
			MemberID:        memberID.String(),
			Level:           level,
			PotentialIncome: float64(config.SeatCapacity) * config.IncomeAmount,
			SeatFilled:      0,
		}

		if err := r.CreateIncomeProjection(projection); err != nil {
			return err
		}
	}

	// Update seat filled
	newSeatFilled := projection.SeatFilled + increment
	if newSeatFilled < 0 {
		newSeatFilled = 0
	}

	config, err := r.GetCommissionConfigByLevel(level)
	if err != nil {
		return err
	}
	if config == nil {
		return errors.New("commission config not found for level")
	}

	projection.SeatFilled = newSeatFilled
	projection.ActualIncome = float64(newSeatFilled) * config.IncomeAmount
	if config.SeatCapacity > 0 {
		projection.PercentageComplete = (float64(newSeatFilled) / float64(config.SeatCapacity)) * 100
	} else {
		projection.PercentageComplete = 0
	}

	projection.CalculatedAt = time.Now()

	return r.UpdateIncomeProjection(projection)
}

// CalculatePotentialIncome calculates potential income for all levels for a member
func (r *referralRepository) CalculatePotentialIncome(memberID uuid.UUID) ([]*models.IncomeProjection, error) {
	var projections []*models.IncomeProjection

	configs, err := r.GetAllCommissionConfigs()
	if err != nil {
		return nil, err
	}

	for _, config := range configs {
		projection := &models.IncomeProjection{
			MemberID:           memberID.String(),
			Level:              config.Level,
			PotentialIncome:    float64(config.SeatCapacity) * config.IncomeAmount,
			SeatFilled:         0,
			PercentageComplete: 0,
			CalculatedAt:       time.Now(),
		}
		projections = append(projections, projection)
	}

	return projections, nil
}

// CalculateActualIncome calculates actual income for a member at a specific level
func (r *referralRepository) CalculateActualIncome(memberID uuid.UUID, level int, referredMembers []uuid.UUID) (float64, error) {
	if level < 1 {
		return 0, nil
	}

	config, err := r.GetCommissionConfigByLevel(level)
	if err != nil {
		return 0, err
	}
	if config == nil {
		return 0, errors.New("commission config not found for level")
	}

	actualReferrals := len(referredMembers)
	if actualReferrals > config.SeatCapacity {
		actualReferrals = config.SeatCapacity
	}

	return float64(actualReferrals) * config.IncomeAmount, nil
}

// CalculateTotalIncome calculates total actual income across all levels for a member
func (r *referralRepository) CalculateTotalIncome(memberID uuid.UUID) (float64, error) {
	var total float64

	projections, err := r.GetIncomeProjectionsByMember(memberID)
	if err != nil {
		return 0, err
	}

	for _, projection := range projections {
		total += projection.ActualIncome
	}

	return total, nil
}

// GetDownlineWithLevels gets downline members with their relationship level
func (r *referralRepository) GetDownlineWithLevels(memberID uuid.UUID, maxLevel int) ([]*models.MemberWithLevel, error) {
	if maxLevel < 1 {
		return []*models.MemberWithLevel{}, nil
	}

	var results []*models.MemberWithLevel

	query := `
		WITH RECURSIVE downline_tree AS (
			SELECT m.*, 1 as level
			FROM members m
			WHERE m.sponsor_id = ? AND m.deleted_at IS NULL
			UNION ALL
			SELECT m.*, dt.level + 1
			FROM members m
			INNER JOIN downline_tree dt ON m.sponsor_id = dt.id
			WHERE m.deleted_at IS NULL AND dt.level < ?
		)
		SELECT *, level as relationship_level FROM downline_tree ORDER BY level, created_at
	`

	err := r.db.DB.Raw(query, memberID, maxLevel).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}

// GetUplineWithLevels gets upline members with their relationship level
func (r *referralRepository) GetUplineWithLevels(memberID uuid.UUID, maxLevel int) ([]*models.MemberWithLevel, error) {
	if maxLevel < 1 {
		return []*models.MemberWithLevel{}, nil
	}

	var results []*models.MemberWithLevel

	query := `
		WITH RECURSIVE upline_tree AS (
			SELECT m.*, 1 as level
			FROM members m
			INNER JOIN members target ON target.sponsor_id = m.id
			WHERE target.id = ? AND m.deleted_at IS NULL
			UNION ALL
			SELECT m.*, ut.level + 1
			FROM members m
			INNER JOIN upline_tree ut ON m.id = ut.sponsor_id
			WHERE m.deleted_at IS NULL AND ut.level < ?
		)
		SELECT *, level as relationship_level FROM upline_tree ORDER BY level
	`

	err := r.db.DB.Raw(query, memberID, maxLevel).Scan(&results).Error
	if err != nil {
		return nil, err
	}

	return results, nil
}
