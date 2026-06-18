package handlers

import (
	"net/http"
	"strconv"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/services"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// DashboardHandler handles dashboard and report HTTP requests
type DashboardHandler struct {
	dashboardService services.DashboardService
	config           *config.Config
	logger           *utils.Logger
}

// NewDashboardHandler creates a new DashboardHandler
func NewDashboardHandler(
	dashboardService services.DashboardService,
	cfg *config.Config,
	logger *utils.Logger,
) *DashboardHandler {
	return &DashboardHandler{
		dashboardService: dashboardService,
		config:           cfg,
		logger:           logger,
	}
}

// @Summary Dashboard overview
// @Description Get high-level dashboard overview stats
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response{data=services.DashboardOverview}
// @Router /api/v1/dashboard/overview [get]
func (h *DashboardHandler) GetOverview(c *gin.Context) {
	overview, err := h.dashboardService.GetOverview()
	if err != nil {
		h.logger.Error(err, "Failed to get dashboard overview", nil)
		utils.InternalServerErrorResponse(c, "Failed to get dashboard overview", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Dashboard overview retrieved successfully", overview)
}

// @Summary Member dashboard stats
// @Description Get detailed member statistics
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response{data=services.MemberDashboardStats}
// @Router /api/v1/dashboard/members [get]
func (h *DashboardHandler) GetMemberStats(c *gin.Context) {
	stats, err := h.dashboardService.GetMemberStats()
	if err != nil {
		h.logger.Error(err, "Failed to get member stats", nil)
		utils.InternalServerErrorResponse(c, "Failed to get member stats", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Member stats retrieved successfully", stats)
}

// @Summary Income dashboard stats
// @Description Get income statistics for the dashboard
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response{data=services.IncomeDashboardStats}
// @Router /api/v1/dashboard/income [get]
func (h *DashboardHandler) GetIncomeStats(c *gin.Context) {
	stats, err := h.dashboardService.GetIncomeStats()
	if err != nil {
		h.logger.Error(err, "Failed to get income stats", nil)
		utils.InternalServerErrorResponse(c, "Failed to get income stats", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Income stats retrieved successfully", stats)
}

// @Summary System health
// @Description Get system health status
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response{data=services.SystemHealth}
// @Router /api/v1/dashboard/health [get]
func (h *DashboardHandler) GetSystemHealth(c *gin.Context) {
	health, err := h.dashboardService.GetSystemHealth()
	if err != nil {
		h.logger.Error(err, "Failed to get system health", nil)
		utils.InternalServerErrorResponse(c, "Failed to get system health", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "System health retrieved successfully", health)
}

// @Summary Income chart data
// @Description Get income chart data for dashboard
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Param period query string false "Period (yearly, monthly)" default(yearly)
// @Success 200 {object} utils.Response{data=services.IncomeChartData}
// @Router /api/v1/dashboard/charts/income [get]
func (h *DashboardHandler) GetIncomeChartData(c *gin.Context) {
	period := c.DefaultQuery("period", "yearly")
	data, err := h.dashboardService.GetIncomeChartData(period)
	if err != nil {
		h.logger.Error(err, "Failed to get income chart data", nil)
		utils.InternalServerErrorResponse(c, "Failed to get income chart data", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Income chart data retrieved successfully", data)
}

// @Summary Member growth chart
// @Description Get member growth chart data
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Param period query string false "Period (yearly, monthly)" default(yearly)
// @Success 200 {object} utils.Response{data=services.MemberGrowthChart}
// @Router /api/v1/dashboard/charts/growth [get]
func (h *DashboardHandler) GetMemberGrowthChart(c *gin.Context) {
	period := c.DefaultQuery("period", "yearly")
	data, err := h.dashboardService.GetMemberGrowthChart(period)
	if err != nil {
		h.logger.Error(err, "Failed to get member growth chart", nil)
		utils.InternalServerErrorResponse(c, "Failed to get member growth chart", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Member growth chart retrieved successfully", data)
}

// @Summary Level distribution
// @Description Get member distribution across MLM levels
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response{data=services.LevelDistribution}
// @Router /api/v1/dashboard/levels [get]
func (h *DashboardHandler) GetLevelDistribution(c *gin.Context) {
	data, err := h.dashboardService.GetLevelDistribution()
	if err != nil {
		h.logger.Error(err, "Failed to get level distribution", nil)
		utils.InternalServerErrorResponse(c, "Failed to get level distribution", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Level distribution retrieved successfully", data)
}

// @Summary Top earners
// @Description Get top earning members
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Param limit query int false "Number of top earners" default(10)
// @Success 200 {object} utils.Response{data=[]services.TopEarner}
// @Router /api/v1/dashboard/top-earners [get]
func (h *DashboardHandler) GetTopEarners(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	data, err := h.dashboardService.GetTopEarners(limit)
	if err != nil {
		h.logger.Error(err, "Failed to get top earners", nil)
		utils.InternalServerErrorResponse(c, "Failed to get top earners", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Top earners retrieved successfully", data)
}

// @Summary Recent activity
// @Description Get recent system activity
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Param limit query int false "Number of activities" default(20)
// @Success 200 {object} utils.Response{data=[]services.ActivityLog}
// @Router /api/v1/dashboard/activity [get]
func (h *DashboardHandler) GetRecentActivity(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "20")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	activities, err := h.dashboardService.GetRecentActivity(limit)
	if err != nil {
		h.logger.Error(err, "Failed to get recent activity", nil)
		utils.InternalServerErrorResponse(c, "Failed to get recent activity", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Recent activity retrieved successfully", activities)
}

// @Summary System alerts
// @Description Get system alerts and notifications
// @Tags dashboard
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response{data=[]services.SystemAlert}
// @Router /api/v1/dashboard/alerts [get]
func (h *DashboardHandler) GetSystemAlerts(c *gin.Context) {
	alerts, err := h.dashboardService.GetSystemAlerts()
	if err != nil {
		h.logger.Error(err, "Failed to get system alerts", nil)
		utils.InternalServerErrorResponse(c, "Failed to get system alerts", err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "System alerts retrieved successfully", alerts)
}
