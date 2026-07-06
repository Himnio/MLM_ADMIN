package handlers

import (
	"net/http"
	"strconv"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/services"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type DistributorHandler struct {
	service services.DistributorService
	config  *config.Config
	logger  *utils.Logger
}

func NewDistributorHandler(
	service services.DistributorService,
	cfg *config.Config,
	logger *utils.Logger,
) *DistributorHandler {
	return &DistributorHandler{
		service: service,
		config:  cfg,
		logger:  logger,
	}
}

// Distributor dashboard overview
func (h *DistributorHandler) GetDashboard(c *gin.Context) {
	userIDStr := c.GetString("member_user_id")
	if userIDStr == "" {
		utils.UnauthorizedResponse(c, "Not authenticated", "")
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid user ID", "")
		return
	}

	data, err := h.service.GetDashboard(userID)
	if err != nil {
		h.logger.Error(err, "Failed to get distributor dashboard", nil)
		utils.InternalServerErrorResponse(c, "Failed to get dashboard", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Dashboard data", data)
}

// Distributor downline (no sensitive data)
func (h *DistributorHandler) GetDownline(c *gin.Context) {
	userIDStr := c.GetString("member_user_id")
	if userIDStr == "" {
		utils.UnauthorizedResponse(c, "Not authenticated", "")
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid user ID", "")
		return
	}

	downlines, err := h.service.GetDownline(userID)
	if err != nil {
		h.logger.Error(err, "Failed to get downline", nil)
		utils.InternalServerErrorResponse(c, "Failed to get downline", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Downline retrieved", gin.H{
		"downlines": downlines,
		"total":     len(downlines),
	})
}

// Distributor own referral info
func (h *DistributorHandler) GetReferralInfo(c *gin.Context) {
	userIDStr := c.GetString("member_user_id")
	if userIDStr == "" {
		utils.UnauthorizedResponse(c, "Not authenticated", "")
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid user ID", "")
		return
	}

	info, err := h.service.GetReferralInfo(userID)
	if err != nil {
		h.logger.Error(err, "Failed to get referral info", nil)
		utils.InternalServerErrorResponse(c, "Failed to get referral info", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Referral info retrieved", info)
}

// Admin: list all distributors
func (h *DistributorHandler) ListDistributors(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	users, total, err := h.service.GetAllDistributors(page, limit)
	if err != nil {
		h.logger.Error(err, "Failed to list distributors", nil)
		utils.InternalServerErrorResponse(c, "Failed to list distributors", "")
		return
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	utils.SuccessResponse(c, http.StatusOK, "Distributors retrieved", gin.H{
		"distributors": users,
		"total":        total,
		"page":         page,
		"limit":        limit,
		"total_pages":  totalPages,
	})
}

// Admin: toggle distributor active/inactive
func (h *DistributorHandler) ToggleActive(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid distributor ID", "")
		return
	}

	if err := h.service.ToggleActive(id); err != nil {
		h.logger.Error(err, "Failed to toggle active status", nil)
		utils.InternalServerErrorResponse(c, "Failed to toggle status", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Status toggled", nil)
}

// Admin: get distributor tree (full data)
func (h *DistributorHandler) GetDistributorTree(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		utils.BadRequestResponse(c, "Invalid distributor ID", "")
		return
	}

	tree, err := h.service.GetDistributorTree(id)
	if err != nil {
		h.logger.Error(err, "Failed to get distributor tree", nil)
		utils.InternalServerErrorResponse(c, "Failed to get tree", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Tree retrieved", tree)
}

// Distributor: get their own tree
func (h *DistributorHandler) GetOwnTree(c *gin.Context) {
	userIDStr := c.GetString("member_user_id")
	if userIDStr == "" {
		utils.UnauthorizedResponse(c, "Not authenticated", "")
		return
	}
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		utils.UnauthorizedResponse(c, "Invalid user ID", "")
		return
	}

	tree, err := h.service.GetDistributorTree(userID)
	if err != nil {
		h.logger.Error(err, "Failed to get own tree", nil)
		utils.InternalServerErrorResponse(c, "Failed to get tree", "")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Tree retrieved", tree)
}
