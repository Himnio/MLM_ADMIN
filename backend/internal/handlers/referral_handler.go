package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/services"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ReferralHandler handles referral-related HTTP requests
type ReferralHandler struct {
	referralService services.ReferralService
	config          *config.Config
	logger          *utils.Logger
}

// NewReferralHandler creates a new ReferralHandler
func NewReferralHandler(
	referralService services.ReferralService,
	cfg *config.Config,
	logger *utils.Logger,
) *ReferralHandler {
	return &ReferralHandler{
		referralService: referralService,
		config:          cfg,
		logger:          logger,
	}
}

// @Summary Get commission config
// @Description Get the MLM commission structure for all levels
// @Tags referrals
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response{data=[]models.CommissionResponse}
// @Router /api/v1/referrals/commission-config [get]
func (h *ReferralHandler) GetCommissionConfig(c *gin.Context) {
	configs, err := h.referralService.GetCommissionConfig()
	if err != nil {
		h.logger.Error(err, "Failed to get commission config", nil)
		utils.InternalServerErrorResponse(c, "Failed to get commission config", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Commission config retrieved successfully", configs)
}

// @Summary Update commission config
// @Description Update commission configuration for a specific level
// @Tags referrals
// @Accept json
// @Produce json
// @Security Bearer
// @Param level path int true "Level number"
// @Param request body services.UpdateCommissionInput true "Commission config update"
// @Success 200 {object} utils.Response{data=models.CommissionResponse}
// @Router /api/v1/referrals/commission-config/{level} [put]
func (h *ReferralHandler) UpdateCommissionConfig(c *gin.Context) {
	level := c.GetInt("level")
	if level < 1 || level > 10 {
		utils.BadRequestResponse(c, "Invalid level", "Level must be between 1 and 10")
		return
	}

	var input services.UpdateCommissionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	config, err := h.referralService.UpdateCommissionConfig(level, &input)
	if err != nil {
		h.logger.Error(err, "Failed to update commission config", nil)
		utils.BadRequestResponse(c, "Failed to update commission config", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Commission config updated successfully", config)
}

// @Summary Get downline tree
// @Description Get the downline referral tree for a member
// @Tags referrals
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Param level query int false "Max depth level" default(10)
// @Success 200 {object} utils.Response{data=services.ReferralTreeResponse}
// @Router /api/v1/referrals/{id}/downline [get]
func (h *ReferralHandler) GetDownline(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	maxLevel := utils.GetQueryParamInt(c, "level", h.config.MLM.MaxLevels)

	tree, err := h.referralService.GetTreeDownline(id, maxLevel)
	if err != nil {
		h.logger.Error(err, "Failed to get downline tree", nil)
		utils.InternalServerErrorResponse(c, "Failed to get downline tree", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Downline tree retrieved successfully", tree)
}

// @Summary Get upline
// @Description Get the upline chain for a member
// @Tags referrals
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Param level query int false "Max depth level" default(10)
// @Success 200 {object} utils.Response{data=services.ReferralTreeResponse}
// @Router /api/v1/referrals/{id}/upline [get]
func (h *ReferralHandler) GetUpline(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	maxLevel := utils.GetQueryParamInt(c, "level", h.config.MLM.MaxLevels)

	tree, err := h.referralService.GetTreeUpline(id, maxLevel)
	if err != nil {
		h.logger.Error(err, "Failed to get upline", nil)
		utils.InternalServerErrorResponse(c, "Failed to get upline", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Upline retrieved successfully", tree)
}

// @Summary Get tree summary
// @Description Get a summary of the referral tree for a member
// @Tags referrals
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Success 200 {object} utils.Response{data=services.TreeSummaryResponse}
// @Router /api/v1/referrals/{id}/summary [get]
func (h *ReferralHandler) GetTreeSummary(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	summary, err := h.referralService.GetTreeSummary(id)
	if err != nil {
		h.logger.Error(err, "Failed to get tree summary", nil)
		utils.InternalServerErrorResponse(c, "Failed to get tree summary", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Tree summary retrieved successfully", summary)
}

// @Summary Get income projection
// @Description Get income projections for a member across all levels
// @Tags referrals
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Success 200 {object} utils.Response{data=services.IncomeProjectionResponse}
// @Router /api/v1/referrals/{id}/income-projection [get]
func (h *ReferralHandler) GetIncomeProjection(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	projection, err := h.referralService.GetIncomeProjection(id)
	if err != nil {
		h.logger.Error(err, "Failed to get income projection", nil)
		utils.InternalServerErrorResponse(c, "Failed to get income projection", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Income projection retrieved successfully", projection)
}

// @Summary Calculate projected growth
// @Description Calculate projected income growth at different percentages for a level
// @Tags referrals
// @Produce json
// @Security Bearer
// @Param level path int true "Level number (1-10)"
// @Success 200 {object} utils.Response{data=services.GrowthProjectionResponse}
// @Router /api/v1/referrals/projected-growth/{level} [get]
func (h *ReferralHandler) CalculateProjectedGrowth(c *gin.Context) {
	level, err := h.getLevelParamFromPath(c, "level")
	if err != nil {
		utils.BadRequestResponse(c, "Invalid level parameter", err.Error())
		return
	}

	growth, err := h.referralService.CalculateProjectedGrowth(level, 100)
	if err != nil {
		h.logger.Error(err, "Failed to calculate projected growth", nil)
		utils.InternalServerErrorResponse(c, "Failed to calculate projected growth", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Projected growth calculated successfully", growth)
}

// @Summary Get referral stats
// @Description Get referral statistics for a member
// @Tags referrals
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Success 200 {object} utils.Response{data=services.ReferralStatsResponse}
// @Router /api/v1/referrals/{id}/stats [get]
func (h *ReferralHandler) GetReferralStats(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	stats, err := h.referralService.GetReferralStats(id)
	if err != nil {
		h.logger.Error(err, "Failed to get referral stats", nil)
		utils.InternalServerErrorResponse(c, "Failed to get referral stats", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Referral stats retrieved successfully", stats)
}

// getLevelParamFromPath extracts level from path parameter
func (h *ReferralHandler) getLevelParamFromPath(c *gin.Context, param string) (int, error) {
	val := c.Param(param)
	if val == "" {
		return 0, nil
	}
	level, err := strconv.Atoi(val)
	if err != nil || level < 1 || level > 10 {
		return 0, fmt.Errorf("level must be between 1 and 10")
	}
	return level, nil
}
