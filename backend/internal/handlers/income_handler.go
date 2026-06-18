package handlers

import (
	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/services"
	"mlm-admin-backend/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// IncomeHandler handles income-related HTTP requests
type IncomeHandler struct {
	incomeService services.IncomeService
	config        *config.Config
	logger        *utils.Logger
}

// NewIncomeHandler creates a new income handler
func NewIncomeHandler(
	incomeService services.IncomeService,
	cfg *config.Config,
	logger *utils.Logger,
) *IncomeHandler {
	return &IncomeHandler{
		incomeService: incomeService,
		config:        cfg,
		logger:        logger,
	}
}

// CalculateIncomeRequest represents request for calculating income
type CalculateIncomeRequest struct {
	MemberID        string `json:"member_id" binding:"required,uuid"`
	SponsorID       string `json:"sponsor_id" binding:"required,uuid"`
	Level           int    `json:"level" binding:"required,min=1,max=10"`
	TransactionType string `json:"transaction_type" binding:"required,oneof=registration referral upgrade bonus"`
}

// @Summary Calculate income for a member
// @Description Calculate and distribute income for a member based on their level and transaction type
// @Tags income
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body CalculateIncomeRequest true "Income calculation request"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/income/calculate [post]
func (h *IncomeHandler) CalculateIncome(c *gin.Context) {
	var req CalculateIncomeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	memberID, err := uuid.Parse(req.MemberID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid member ID", err.Error())
		return
	}

	sponsorID, err := uuid.Parse(req.SponsorID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid sponsor ID", err.Error())
		return
	}

	result, err := h.incomeService.CalculateIncomeForMember(memberID, sponsorID, req.Level, req.TransactionType)
	if err != nil {
		h.logger.Error(err, "Failed to calculate income", nil)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to calculate income", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Income calculated successfully", result)
}

// @Summary Get member income history
// @Description Get paginated income history for a specific member
// @Tags income
// @Produce json
// @Security Bearer
// @Param member_id path string true "Member ID"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/income/member/{member_id}/history [get]
func (h *IncomeHandler) GetMemberIncomeHistory(c *gin.Context) {
	memberID, err := uuid.Parse(c.Param("member_id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid member ID", err.Error())
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")
	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	data, total, err := h.incomeService.GetMemberIncomeHistory(memberID, page, limit)
	if err != nil {
		h.logger.Error(err, "Failed to get income history", nil)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve income history", err.Error())
		return
	}

	utils.SendPaginatedResponse(c, http.StatusOK, "Income history retrieved successfully", data, total, page, limit)
}

// @Summary Get member total income
// @Description Get the total income accumulated for a specific member
// @Tags income
// @Produce json
// @Security Bearer
// @Param member_id path string true "Member ID"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/income/member/{member_id}/total [get]
func (h *IncomeHandler) GetMemberTotalIncome(c *gin.Context) {
	memberID, err := uuid.Parse(c.Param("member_id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid member ID", err.Error())
		return
	}

	totalIncome, err := h.incomeService.GetMemberTotalIncome(memberID)
	if err != nil {
		h.logger.Error(err, "Failed to get total income", nil)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve total income", err.Error())
		return
	}

	response := map[string]interface{}{
		"member_id":    memberID.String(),
		"total_income": totalIncome,
	}
	utils.SuccessResponse(c, http.StatusOK, "Total income retrieved successfully", response)
}

// @Summary Get income projection for a member
// @Description Get projected future income for a member based on their referral tree
// @Tags income
// @Produce json
// @Security Bearer
// @Param member_id path string true "Member ID"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/income/member/{member_id}/projection [get]
func (h *IncomeHandler) GetIncomeProjection(c *gin.Context) {
	memberID, err := uuid.Parse(c.Param("member_id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid member ID", err.Error())
		return
	}

	projection, err := h.incomeService.GetIncomeProjection(memberID)
	if err != nil {
		h.logger.Error(err, "Failed to get income projection", nil)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve projection", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Income projection retrieved successfully", projection)
}

// @Summary Get income by level
// @Description Get paginated income records filtered by MLM level
// @Tags income
// @Produce json
// @Security Bearer
// @Param level path int true "MLM Level (1-10)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/income/level/{level} [get]
func (h *IncomeHandler) GetIncomeByLevel(c *gin.Context) {
	levelStr := c.Param("level")
	level, err := strconv.Atoi(levelStr)
	if err != nil || level < 1 || level > 10 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid level: must be between 1-10", err.Error())
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")
	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)

	data, total, err := h.incomeService.GetIncomeByLevel(level, page, limit)
	if err != nil {
		h.logger.Error(err, "Failed to get income by level", nil)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve income", err.Error())
		return
	}

	utils.SendPaginatedResponse(c, http.StatusOK, "Income retrieved successfully", data, total, page, limit)
}

// @Summary Get commission configuration
// @Description Get all MLM commission configurations for all levels
// @Tags commission
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/commission/config [get]
func (h *IncomeHandler) GetCommissionConfig(c *gin.Context) {
	configs, err := h.incomeService.GetCommissionConfig()
	if err != nil {
		h.logger.Error(err, "Failed to get commission configuration", nil)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve commission configuration", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Commission configuration retrieved successfully", configs)
}

// UpdateCommissionConfigRequest represents request for updating commission config
type UpdateCommissionConfigRequest struct {
	IncomeAmount         *float64 `json:"income_amount,omitempty"`
	SeatCapacity         *int     `json:"seat_capacity,omitempty"`
	CommissionPercentage *float64 `json:"commission_percentage,omitempty"`
	IsActive             *bool    `json:"is_active,omitempty"`
}

// @Summary Update commission configuration
// @Description Update commission configuration for a specific MLM level
// @Tags commission
// @Accept json
// @Produce json
// @Security Bearer
// @Param level path int true "MLM Level (1-10)"
// @Param request body UpdateCommissionConfigRequest true "Commission config update"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/commission/config/{level} [put]
func (h *IncomeHandler) UpdateCommissionConfig(c *gin.Context) {
	levelStr := c.Param("level")
	level, err := strconv.Atoi(levelStr)
	if err != nil || level < 1 || level > 10 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid level: must be between 1-10", err.Error())
		return
	}

	var req UpdateCommissionConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	input := &services.UpdateCommissionConfigInput{
		IncomeAmount:         req.IncomeAmount,
		SeatCapacity:         req.SeatCapacity,
		CommissionPercentage: req.CommissionPercentage,
		IsActive:             req.IsActive,
	}

	config, err := h.incomeService.UpdateCommissionConfig(level, input)
	if err != nil {
		h.logger.Error(err, "Failed to update commission configuration", nil)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update commission configuration", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Commission configuration updated successfully", config)
}

// ReverseIncomeRequest represents request for reversing income
type ReverseIncomeRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// @Summary Reverse an income record
// @Description Reverse a previously calculated income record (Super Admin only)
// @Tags income
// @Accept json
// @Produce json
// @Security Bearer
// @Param income_id path string true "Income ID"
// @Param request body ReverseIncomeRequest true "Reversal reason"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/income/{income_id}/reverse [post]
func (h *IncomeHandler) ReverseIncome(c *gin.Context) {
	incomeID, err := uuid.Parse(c.Param("income_id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid income ID", err.Error())
		return
	}

	var req ReverseIncomeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	var adminUUID *uuid.UUID
	adminID, exists := c.Get("admin_id")
	if exists {
		if id, ok := adminID.(uuid.UUID); ok {
			adminUUID = &id
		}
	}

	if err := h.incomeService.ReverseIncome(incomeID, req.Reason, adminUUID); err != nil {
		h.logger.Error(err, "Failed to reverse income", nil)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to reverse income", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Income reversed successfully", nil)
}

// @Summary Get level snapshot history
// @Description Get snapshot history for a specific member at a specific MLM level
// @Tags income
// @Produce json
// @Security Bearer
// @Param member_id path string true "Member ID"
// @Param level path int true "MLM Level (1-10)"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/income/member/{member_id}/snapshot/{level} [get]
func (h *IncomeHandler) GetLevelSnapshotHistory(c *gin.Context) {
	memberID, err := uuid.Parse(c.Param("member_id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid member ID", err.Error())
		return
	}

	levelStr := c.Param("level")
	level, err := strconv.Atoi(levelStr)
	if err != nil || level < 1 || level > 10 {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid level: must be between 1-10", err.Error())
		return
	}

	snapshots, err := h.incomeService.GetLevelSnapshotHistory(memberID, level)
	if err != nil {
		h.logger.Error(err, "Failed to get snapshot history", nil)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve snapshot history", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Level snapshot history retrieved successfully", snapshots)
}

// @Summary Get income statistics
// @Description Get overall income statistics and commission configuration summary
// @Tags income
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/v1/income/statistics [get]
func (h *IncomeHandler) GetIncomeStatistics(c *gin.Context) {
	configs, err := h.incomeService.GetCommissionConfig()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve statistics", err.Error())
		return
	}

	stats := map[string]interface{}{
		"timestamp":         time.Now(),
		"commission_config": configs,
	}
	utils.SuccessResponse(c, http.StatusOK, "Income statistics retrieved successfully", stats)
}
