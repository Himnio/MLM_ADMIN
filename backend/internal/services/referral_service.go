package services

import (
	"errors"
	"fmt"
	"math"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/repositories"
	"mlm-admin-backend/internal/utils"

	"github.com/google/uuid"
)

// IncomeGrowthPercentages defines the expected growth percentages for income projections
var IncomeGrowthPercentages = []float64{100, 75, 50, 25, 10, 5}

// ReferralService handles referral tree business logic
type ReferralService interface {
	// Commission configs
	GetCommissionConfig() ([]*models.CommissionResponse, error)
	UpdateCommissionConfig(level int, input *UpdateCommissionInput) (*models.CommissionResponse, error)

	// Referral tree
	GetTreeDownline(memberID uuid.UUID, maxLevel int) (*ReferralTreeResponse, error)
	GetTreeUpline(memberID uuid.UUID, maxLevel int) (*ReferralTreeResponse, error)
	GetTreeSummary(memberID uuid.UUID) (*TreeSummaryResponse, error)

	// Income projections
	GetIncomeProjection(memberID uuid.UUID) (*IncomeProjectionResponse, error)
	CalculateProjectedGrowth(level int, percentage float64) (*GrowthProjectionResponse, error)

	// Referral tracking
	GetReferralStats(memberID uuid.UUID) (*ReferralStatsResponse, error)
	UpdateReferralCounts(memberID uuid.UUID, referralID uuid.UUID) error
}

type referralService struct {
	referralRepo repositories.ReferralRepository
	config       *config.Config
	logger       *utils.Logger
}

// NewReferralService creates a new referral service
func NewReferralService(
	referralRepo repositories.ReferralRepository,
	cfg *config.Config,
	logger *utils.Logger,
) ReferralService {
	return &referralService{
		referralRepo: referralRepo,
		config:       cfg,
		logger:       logger,
	}
}

// UpdateCommissionInput represents input for updating commission config
type UpdateCommissionInput struct {
	IncomeAmount         *float64 `json:"income_amount,omitempty"`
	SeatCapacity         *int     `json:"seat_capacity,omitempty"`
	CommissionPercentage *float64 `json:"commission_percentage,omitempty"`
}

// ReferralTreeResponse represents the full referral tree response
type ReferralTreeResponse struct {
	Member        *models.MemberResponse `json:"member"`
	Levels        []*LevelDetail         `json:"levels"`
	TotalDownline int                    `json:"total_downline"`
	MaxDepth      int                    `json:"max_depth"`
}

// LevelDetail represents detail for a specific tree level
type LevelDetail struct {
	Level           int                       `json:"level"`
	SeatCapacity    int                       `json:"seat_capacity"`
	IncomePerSeat   float64                   `json:"income_per_seat"`
	Members         []*models.MemberWithLevel `json:"members"`
	TotalMembers    int                       `json:"total_members"`
	PotentialIncome float64                   `json:"potential_income"`
	ActualIncome    float64                   `json:"actual_income"`
}

// TreeSummaryResponse represents a summary of the referral tree
type TreeSummaryResponse struct {
	TotalMembers    int64             `json:"total_members"`
	ActiveMembers   int64             `json:"active_members"`
	TotalLevels     int               `json:"total_levels"`
	TotalIncome     float64           `json:"total_income"`
	PotentialIncome float64           `json:"potential_income"`
	LevelBreakdown  []*LevelBreakdown `json:"level_breakdown"`
}

// LevelBreakdown represents breakdown for a specific level
type LevelBreakdown struct {
	Level        int     `json:"level"`
	SeatCapacity int     `json:"seat_capacity"`
	SeatFilled   int     `json:"seat_filled"`
	Percentage   float64 `json:"percentage"`
	IncomeAmount float64 `json:"income_amount"`
	TotalIncome  float64 `json:"total_income"`
}

// IncomeProjectionResponse represents the income projection for a member
type IncomeProjectionResponse struct {
	MemberID          string              `json:"member_id"`
	TotalPotential    float64             `json:"total_potential"`
	TotalActual       float64             `json:"total_actual"`
	LevelProjections  []*LevelProjection  `json:"level_projections"`
	GrowthProjections []*GrowthProjection `json:"growth_projections"`
}

// LevelProjection represents projection for a single level
type LevelProjection struct {
	Level              int     `json:"level"`
	IncomePerSeat      float64 `json:"income_per_seat"`
	SeatCapacity       int     `json:"seat_capacity"`
	SeatFilled         int     `json:"seat_filled"`
	PercentageComplete float64 `json:"percentage_complete"`
	PotentialIncome    float64 `json:"potential_income"`
	ActualIncome       float64 `json:"actual_income"`
}

// GrowthProjection represents growth projection at different percentages
type GrowthProjection struct {
	Percentage  float64 `json:"percentage"`
	TotalIncome float64 `json:"total_income"`
	Description string  `json:"description"`
}

// GrowthProjectionResponse represents the growth projection response
type GrowthProjectionResponse struct {
	Level       int                 `json:"level"`
	Projections []*GrowthProjection `json:"projections"`
}

// ReferralStatsResponse represents referral statistics
type ReferralStatsResponse struct {
	TotalReferrals    int         `json:"total_referrals"`
	DirectReferrals   int         `json:"direct_referrals"`
	IndirectReferrals int         `json:"indirect_referrals"`
	MaxTreeDepth      int         `json:"max_tree_depth"`
	LevelDistribution map[int]int `json:"level_distribution"`
}

// GetCommissionConfig retrieves all commission configs
func (s *referralService) GetCommissionConfig() ([]*models.CommissionResponse, error) {
	configs, err := s.referralRepo.GetAllCommissionConfigs()
	if err != nil {
		return nil, err
	}

	responses := make([]*models.CommissionResponse, len(configs))
	for i, c := range configs {
		responses[i] = c.ToResponse()
	}

	return responses, nil
}

// UpdateCommissionConfig updates a commission configuration
func (s *referralService) UpdateCommissionConfig(level int, input *UpdateCommissionInput) (*models.CommissionResponse, error) {
	config, err := s.referralRepo.GetCommissionConfigByLevel(level)
	if err != nil {
		return nil, err
	}
	if config == nil {
		return nil, errors.New("commission config not found for level")
	}

	if input.IncomeAmount != nil {
		config.IncomeAmount = *input.IncomeAmount
	}
	if input.SeatCapacity != nil {
		config.SeatCapacity = *input.SeatCapacity
	}
	if input.CommissionPercentage != nil {
		config.CommissionPercentage = *input.CommissionPercentage
	}

	if err := s.referralRepo.UpdateCommissionConfig(config); err != nil {
		return nil, err
	}

	return config.ToResponse(), nil
}

// GetTreeDownline gets the downline tree for a member
func (s *referralService) GetTreeDownline(memberID uuid.UUID, maxLevel int) (*ReferralTreeResponse, error) {
	if maxLevel < 1 || maxLevel > s.config.MLM.MaxLevels {
		maxLevel = s.config.MLM.MaxLevels
	}

	members, err := s.referralRepo.GetDownlineWithLevels(memberID, maxLevel)
	if err != nil {
		return nil, err
	}

	// Group members by level
	levelMap := make(map[int][]*models.MemberWithLevel)
	for _, m := range members {
		level := m.RelationshipLevel
		levelMap[level] = append(levelMap[level], m)
	}

	// Build level details
	var levels []*LevelDetail
	totalDownline := 0
	for i := 1; i <= maxLevel; i++ {
		levelMembers := levelMap[i]
		if levelMembers == nil {
			levelMembers = []*models.MemberWithLevel{}
		}

		config, _ := s.referralRepo.GetCommissionConfigByLevel(i)
		incomePerSeat := 0.0
		seatCapacity := 0
		if config != nil {
			incomePerSeat = config.IncomeAmount
			seatCapacity = config.SeatCapacity
		}

		totalDownline += len(levelMembers)

		levels = append(levels, &LevelDetail{
			Level:           i,
			SeatCapacity:    seatCapacity,
			IncomePerSeat:   incomePerSeat,
			Members:         levelMembers,
			TotalMembers:    len(levelMembers),
			PotentialIncome: float64(seatCapacity) * incomePerSeat,
			ActualIncome:    float64(len(levelMembers)) * incomePerSeat,
		})
	}

	// Create base member response
	memberResp := &models.MemberResponse{ID: memberID.String()}

	return &ReferralTreeResponse{
		Member:        memberResp,
		Levels:        levels,
		TotalDownline: totalDownline,
		MaxDepth:      maxLevel,
	}, nil
}

// GetTreeUpline gets the upline chain for a member
func (s *referralService) GetTreeUpline(memberID uuid.UUID, maxLevel int) (*ReferralTreeResponse, error) {
	if maxLevel < 1 || maxLevel > s.config.MLM.MaxLevels {
		maxLevel = s.config.MLM.MaxLevels
	}

	members, err := s.referralRepo.GetUplineWithLevels(memberID, maxLevel)
	if err != nil {
		return nil, err
	}

	// Group members by level
	levelMap := make(map[int][]*models.MemberWithLevel)
	for _, m := range members {
		level := m.RelationshipLevel
		levelMap[level] = append(levelMap[level], m)
	}

	// Build level details
	var levels []*LevelDetail
	for i := 1; i <= maxLevel; i++ {
		levelMembers := levelMap[i]
		if levelMembers == nil {
			levelMembers = []*models.MemberWithLevel{}
		}

		config, _ := s.referralRepo.GetCommissionConfigByLevel(i)
		incomePerSeat := 0.0
		seatCapacity := 0
		if config != nil {
			incomePerSeat = config.IncomeAmount
			seatCapacity = config.SeatCapacity
		}

		levels = append(levels, &LevelDetail{
			Level:           i,
			SeatCapacity:    seatCapacity,
			IncomePerSeat:   incomePerSeat,
			Members:         levelMembers,
			TotalMembers:    len(levelMembers),
			PotentialIncome: float64(seatCapacity) * incomePerSeat,
			ActualIncome:    float64(len(levelMembers)) * incomePerSeat,
		})
	}

	memberResp := &models.MemberResponse{ID: memberID.String()}

	return &ReferralTreeResponse{
		Member:        memberResp,
		Levels:        levels,
		TotalDownline: len(members),
		MaxDepth:      maxLevel,
	}, nil
}

// GetTreeSummary gets a summary of the referral tree for a member
func (s *referralService) GetTreeSummary(memberID uuid.UUID) (*TreeSummaryResponse, error) {
	maxLevel := s.config.MLM.MaxLevels

	downline, err := s.referralRepo.GetDownlineWithLevels(memberID, maxLevel)
	if err != nil {
		return nil, err
	}

	// Count members by level
	levelCount := make(map[int]int)
	for _, m := range downline {
		levelCount[m.RelationshipLevel]++
	}

	// Build level breakdown
	var breakdown []*LevelBreakdown
	totalIncome := 0.0
	totalPotential := 0.0

	for i := 1; i <= maxLevel; i++ {
		config, _ := s.referralRepo.GetCommissionConfigByLevel(i)
		if config == nil {
			continue
		}

		seatFilled := levelCount[i]
		levelIncome := float64(seatFilled) * config.IncomeAmount
		levelPotential := float64(config.SeatCapacity) * config.IncomeAmount
		percentage := 0.0
		if config.SeatCapacity > 0 {
			percentage = (float64(seatFilled) / float64(config.SeatCapacity)) * 100
		}

		totalIncome += levelIncome
		totalPotential += levelPotential

		breakdown = append(breakdown, &LevelBreakdown{
			Level:        i,
			SeatCapacity: config.SeatCapacity,
			SeatFilled:   seatFilled,
			Percentage:   math.Round(percentage*100) / 100,
			IncomeAmount: config.IncomeAmount,
			TotalIncome:  levelIncome,
		})
	}

	// Get member stats
	totalMembers := int64(len(downline))

	return &TreeSummaryResponse{
		TotalMembers:    totalMembers,
		ActiveMembers:   totalMembers,
		TotalLevels:     maxLevel,
		TotalIncome:     totalIncome,
		PotentialIncome: totalPotential,
		LevelBreakdown:  breakdown,
	}, nil
}

// GetIncomeProjection gets income projection for a member
func (s *referralService) GetIncomeProjection(memberID uuid.UUID) (*IncomeProjectionResponse, error) {
	configs, err := s.referralRepo.GetAllCommissionConfigs()
	if err != nil {
		return nil, err
	}

	projections, err := s.referralRepo.GetIncomeProjectionsByMember(memberID)
	if err != nil {
		return nil, err
	}

	// Build projection map
	projMap := make(map[int]*models.IncomeProjection)
	for _, p := range projections {
		projMap[p.Level] = p
	}

	// Build level projections
	var levelProjs []*LevelProjection
	totalPotential := 0.0
	totalActual := 0.0

	for _, config := range configs {
		proj := projMap[config.Level]
		seatFilled := 0
		if proj != nil {
			seatFilled = proj.SeatFilled
		}

		potentialIncome := float64(config.SeatCapacity) * config.IncomeAmount
		actualIncome := float64(seatFilled) * config.IncomeAmount
		percentageComplete := 0.0
		if config.SeatCapacity > 0 {
			percentageComplete = (float64(seatFilled) / float64(config.SeatCapacity)) * 100
		}

		totalPotential += potentialIncome
		totalActual += actualIncome

		levelProjs = append(levelProjs, &LevelProjection{
			Level:              config.Level,
			IncomePerSeat:      config.IncomeAmount,
			SeatCapacity:       config.SeatCapacity,
			SeatFilled:         seatFilled,
			PercentageComplete: math.Round(percentageComplete*100) / 100,
			PotentialIncome:    potentialIncome,
			ActualIncome:       actualIncome,
		})
	}

	// Build growth projections (100%, 75%, 50%, 25%, 10%, 5%)
	var growthProjs []*GrowthProjection
	for _, pct := range IncomeGrowthPercentages {
		growthIncome := totalPotential * (pct / 100)
		growthProjs = append(growthProjs, &GrowthProjection{
			Percentage:  pct,
			TotalIncome: math.Round(growthIncome*100) / 100,
			Description: fmt.Sprintf("%.0f%% Growth - ₹%.2f", pct, growthIncome),
		})
	}

	return &IncomeProjectionResponse{
		MemberID:          memberID.String(),
		TotalPotential:    math.Round(totalPotential*100) / 100,
		TotalActual:       math.Round(totalActual*100) / 100,
		LevelProjections:  levelProjs,
		GrowthProjections: growthProjs,
	}, nil
}

// CalculateProjectedGrowth calculates projected income at a growth percentage
func (s *referralService) CalculateProjectedGrowth(level int, percentage float64) (*GrowthProjectionResponse, error) {
	config, err := s.referralRepo.GetCommissionConfigByLevel(level)
	if err != nil {
		return nil, err
	}
	if config == nil {
		return nil, errors.New("commission config not found for level")
	}

	maxIncome := float64(config.SeatCapacity) * config.IncomeAmount

	var projections []*GrowthProjection
	for _, pct := range IncomeGrowthPercentages {
		projected := maxIncome * (pct / 100)
		projections = append(projections, &GrowthProjection{
			Percentage:  pct,
			TotalIncome: math.Round(projected*100) / 100,
			Description: fmt.Sprintf("%.0f%% of max - ₹%.2f", pct, projected),
		})
	}

	return &GrowthProjectionResponse{
		Level:       level,
		Projections: projections,
	}, nil
}

// GetReferralStats gets referral statistics for a member
func (s *referralService) GetReferralStats(memberID uuid.UUID) (*ReferralStatsResponse, error) {
	directReferrals, err := s.referralRepo.GetDirectReferralsCount(memberID)
	if err != nil {
		return nil, err
	}

	// Get downline with levels
	maxLevel := s.config.MLM.MaxLevels
	downline, err := s.referralRepo.GetDownlineWithLevels(memberID, maxLevel)
	if err != nil {
		return nil, err
	}

	// Calculate level distribution and max depth
	levelDist := make(map[int]int)
	maxDepth := 0
	for _, m := range downline {
		levelDist[m.RelationshipLevel]++
		if m.RelationshipLevel > maxDepth {
			maxDepth = m.RelationshipLevel
		}
	}

	totalReferrals := len(downline)
	indirectReferrals := totalReferrals - directReferrals

	return &ReferralStatsResponse{
		TotalReferrals:    totalReferrals,
		DirectReferrals:   directReferrals,
		IndirectReferrals: indirectReferrals,
		MaxTreeDepth:      maxDepth,
		LevelDistribution: levelDist,
	}, nil
}

// UpdateReferralCounts updates referral counts for a member and their upline when a new referral joins
func (s *referralService) UpdateReferralCounts(memberID uuid.UUID, referralID uuid.UUID) error {
	// Update the member's own referral count at level 1
	if err := s.referralRepo.UpdateReferralCount(memberID, 1, 1); err != nil {
		s.logger.Error(err, "Failed to update direct referral count", nil)
		return err
	}

	// Traverse upline to update their referral counts at appropriate levels
	upline, err := s.referralRepo.GetUplineWithLevels(memberID, s.config.MLM.MaxLevels)
	if err != nil {
		return err
	}

	for _, u := range upline {
		// The new referral is at level+1 for this upline member
		referralLevel := u.RelationshipLevel + 1
		if referralLevel <= s.config.MLM.MaxLevels {
			if err := s.referralRepo.UpdateReferralCount(u.ID, referralLevel, 1); err != nil {
				s.logger.Error(err, "Failed to update upline referral count", nil)
				continue
			}
		}
	}

	return nil
}
