package utils

import (
	"fmt"
	"math"
)

// MLMLevelConfig represents a single level configuration in the MLM structure
type MLMLevelConfig struct {
	Level                int     `json:"level"`
	IncomeAmount         float64 `json:"income_amount"`
	SeatCapacity         int     `json:"seat_capacity"`
	CommissionPercentage float64 `json:"commission_percentage"`
}

// IncomeCalculationParams holds parameters for income calculation
type IncomeCalculationParams struct {
	Level             int
	MemberSeatsFilled int
	SeatCapacity      int
	BaseAmount        float64
	CommissionPercent float64
	GrowthPercentage  float64 // For projections
}

// IncomeCalculator handles all MLM income calculations
type IncomeCalculator struct {
	configs map[int]*MLMLevelConfig
}

// NewIncomeCalculator creates a new income calculator with level configurations
func NewIncomeCalculator(configs []*MLMLevelConfig) *IncomeCalculator {
	configMap := make(map[int]*MLMLevelConfig)
	for _, cfg := range configs {
		configMap[cfg.Level] = cfg
	}
	return &IncomeCalculator{configs: configMap}
}

// CalculateIncomeForLevel calculates income for a specific level
// Formula: Income = (BaseAmount × CommissionPercentage / 100) × (SeatsFilled / SeatCapacity)
func (ic *IncomeCalculator) CalculateIncomeForLevel(params IncomeCalculationParams) (float64, error) {
	// Validate level
	if params.Level < 1 || params.Level > 10 {
		return 0, fmt.Errorf("invalid level: %d, must be between 1-10", params.Level)
	}

	// Validate seats
	if params.MemberSeatsFilled < 0 || params.MemberSeatsFilled > params.SeatCapacity {
		return 0, fmt.Errorf("invalid seats: %d filled out of %d capacity", params.MemberSeatsFilled, params.SeatCapacity)
	}

	// Prevent division by zero
	if params.SeatCapacity == 0 {
		return 0, fmt.Errorf("seat capacity cannot be zero")
	}

	// Calculate commission first
	commission := (params.BaseAmount * params.CommissionPercent) / 100

	// Calculate based on seat filling
	seatFillPercentage := float64(params.MemberSeatsFilled) / float64(params.SeatCapacity)
	income := commission * seatFillPercentage

	return math.Round(income*100) / 100, nil
}

// CalculateTotalDownlineIncome calculates total income across all levels
func (ic *IncomeCalculator) CalculateTotalDownlineIncome(memberLevels map[int]IncomeCalculationParams) (float64, map[int]float64, error) {
	totalIncome := 0.0
	levelIncomes := make(map[int]float64)

	for level, params := range memberLevels {
		income, err := ic.CalculateIncomeForLevel(params)
		if err != nil {
			return 0, nil, err
		}
		levelIncomes[level] = income
		totalIncome += income
	}

	return math.Round(totalIncome*100) / 100, levelIncomes, nil
}

// CalculateProjectedIncome calculates projected income based on growth percentage
// Formula: ProjectedIncome = ActualIncome × (GrowthPercentage / 100)
func (ic *IncomeCalculator) CalculateProjectedIncome(actualIncome, growthPercentage float64) (float64, error) {
	if growthPercentage < 0 || growthPercentage > 100 {
		return 0, fmt.Errorf("invalid growth percentage: %f, must be between 0-100", growthPercentage)
	}

	projected := (actualIncome * growthPercentage) / 100
	return math.Round(projected*100) / 100, nil
}

// CalculatePotentialIncome calculates maximum possible income if all seats are filled
func (ic *IncomeCalculator) CalculatePotentialIncome(level int) (float64, error) {
	cfg, exists := ic.configs[level]
	if !exists {
		return 0, fmt.Errorf("level %d not configured", level)
	}

	// Potential income when all seats are filled
	commission := (cfg.IncomeAmount * cfg.CommissionPercentage) / 100
	potential := commission * float64(cfg.SeatCapacity)
	return math.Round(potential*100) / 100, nil
}

// CalculateCompletionPercentage calculates what percentage of potential income has been achieved
func (ic *IncomeCalculator) CalculateCompletionPercentage(level, seatsFilled int) (float64, error) {
	cfg, exists := ic.configs[level]
	if !exists {
		return 0, fmt.Errorf("level %d not configured", level)
	}

	if seatsFilled < 0 || seatsFilled > cfg.SeatCapacity {
		return 0, fmt.Errorf("invalid seats: %d filled out of %d capacity", seatsFilled, cfg.SeatCapacity)
	}

	percentage := (float64(seatsFilled) / float64(cfg.SeatCapacity)) * 100
	return math.Round(percentage*100) / 100, nil
}

// CalculateRemainingSeats returns remaining seats for a level
func (ic *IncomeCalculator) CalculateRemainingSeats(level, seatsFilled int) (int, error) {
	cfg, exists := ic.configs[level]
	if !exists {
		return 0, fmt.Errorf("level %d not configured", level)
	}

	remaining := cfg.SeatCapacity - seatsFilled
	if remaining < 0 {
		return 0, fmt.Errorf("seats filled exceeds capacity")
	}

	return remaining, nil
}

// GetLevelConfig returns configuration for a specific level
func (ic *IncomeCalculator) GetLevelConfig(level int) (*MLMLevelConfig, error) {
	cfg, exists := ic.configs[level]
	if !exists {
		return nil, fmt.Errorf("level %d not configured", level)
	}
	return cfg, nil
}

// ValidateAllLevelsConfigured checks if all 10 levels are configured
func (ic *IncomeCalculator) ValidateAllLevelsConfigured() error {
	for i := 1; i <= 10; i++ {
		if _, exists := ic.configs[i]; !exists {
			return fmt.Errorf("level %d is not configured", i)
		}
	}
	return nil
}

// CalculateGrowthScenarios returns income projections for all standard growth percentages
func (ic *IncomeCalculator) CalculateGrowthScenarios(actualIncome float64) (map[string]float64, error) {
	growthPercentages := map[string]float64{
		"100_percent": 100.0,
		"75_percent":  75.0,
		"50_percent":  50.0,
		"25_percent":  25.0,
		"10_percent":  10.0,
		"5_percent":   5.0,
	}

	scenarios := make(map[string]float64)
	for scenario, percentage := range growthPercentages {
		projected, err := ic.CalculateProjectedIncome(actualIncome, percentage)
		if err != nil {
			return nil, err
		}
		scenarios[scenario] = projected
	}

	return scenarios, nil
}

// CalculateMaxPossibleIncome calculates the theoretical maximum income if all levels are fully filled
func (ic *IncomeCalculator) CalculateMaxPossibleIncome() (float64, map[int]float64, error) {
	totalIncome := 0.0
	levelIncomes := make(map[int]float64)

	for level := 1; level <= 10; level++ {
		potential, err := ic.CalculatePotentialIncome(level)
		if err != nil {
			return 0, nil, err
		}
		levelIncomes[level] = potential
		totalIncome += potential
	}

	return math.Round(totalIncome*100) / 100, levelIncomes, nil
}

// CalculateLevelProgression returns income breakdown for each completed level
func (ic *IncomeCalculator) CalculateLevelProgression(seatsPerLevel map[int]int) (map[int]float64, float64, error) {
	levelIncomes := make(map[int]float64)
	totalIncome := 0.0

	for level := 1; level <= 10; level++ {
		cfg, err := ic.GetLevelConfig(level)
		if err != nil {
			return nil, 0, err
		}

		seats, exists := seatsPerLevel[level]
		if !exists {
			seats = 0
		}

		// Calculate income for this level
		params := IncomeCalculationParams{
			Level:             level,
			MemberSeatsFilled: seats,
			SeatCapacity:      cfg.SeatCapacity,
			BaseAmount:        cfg.IncomeAmount,
			CommissionPercent: cfg.CommissionPercentage,
		}

		income, err := ic.CalculateIncomeForLevel(params)
		if err != nil {
			return nil, 0, err
		}

		levelIncomes[level] = income
		totalIncome += income
	}

	return levelIncomes, math.Round(totalIncome*100) / 100, nil
}

// CalculateCommissionPercentageOnAmount calculates commission amount based on percentage
func (ic *IncomeCalculator) CalculateCommissionPercentageOnAmount(amount, percentage float64) float64 {
	commission := (amount * percentage) / 100
	return math.Round(commission*100) / 100
}

// ValidateIncomeAmount validates if income amount is within expected range for a level
func (ic *IncomeCalculator) ValidateIncomeAmount(level int, amount float64) (bool, error) {
	_, err := ic.GetLevelConfig(level)
	if err != nil {
		return false, err
	}

	// Income should not exceed base amount * 100 (full commission percentage)
	maxIncome, err := ic.CalculatePotentialIncome(level)
	if err != nil {
		return false, err
	}

	return amount >= 0 && amount <= maxIncome, nil
}
