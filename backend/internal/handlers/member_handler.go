package handlers

import (
	"net/http"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/services"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// MemberHandler handles member HTTP requests
type MemberHandler struct {
	memberService services.MemberService
	config        *config.Config
	logger        *utils.Logger
	validator     *validator.Validate
}

// NewMemberHandler creates a new MemberHandler
func NewMemberHandler(
	memberService services.MemberService,
	cfg *config.Config,
	logger *utils.Logger,
) *MemberHandler {
	return &MemberHandler{
		memberService: memberService,
		config:        cfg,
		logger:        logger,
		validator:     validator.New(),
	}
}

// @Summary List members
// @Description Get paginated list of members with filtering
// @Tags members
// @Accept json
// @Produce json
// @Security Bearer
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Param status query string false "Filter by status" Enums(active,inactive,pending,suspended)
// @Param search query string false "Search by name, code, email, or phone"
// @Success 200 {object} utils.Response{data=[]models.MemberResponse}
// @Router /api/v1/members [get]
func (h *MemberHandler) ListMembers(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c, h.config.Pagination.DefaultLimit, h.config.Pagination.MaxLimit)

	filter := &models.MemberFilter{
		Status: utils.GetQueryParamPtr(c, "status"),
		Search: utils.GetQueryParamPtr(c, "search"),
	}

	members, total, err := h.memberService.List(filter, page, limit)
	if err != nil {
		h.logger.Error(err, "Failed to list members", nil)
		utils.InternalServerErrorResponse(c, "Failed to list members", err.Error())
		return
	}

	// Convert to response objects
	responses := make([]*models.MemberResponse, len(members))
	for i, m := range members {
		responses[i] = m.ToResponse()
	}

	utils.SendPaginatedResponse(c, http.StatusOK, "Members retrieved successfully", responses, total, page, limit)
}

// @Summary Get member by ID
// @Description Get a single member by their ID
// @Tags members
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Success 200 {object} utils.Response{data=models.MemberResponse}
// @Router /api/v1/members/{id} [get]
func (h *MemberHandler) GetMember(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	member, err := h.memberService.GetByID(id)
	if err != nil {
		utils.NotFoundResponse(c, "Member not found", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Member retrieved successfully", member.ToResponse())
}

// @Summary Create member
// @Description Create a new member in the MLM system
// @Tags members
// @Accept json
// @Produce json
// @Security Bearer
// @Param request body models.CreateMemberInput true "Member creation details"
// @Success 201 {object} utils.Response{data=models.MemberResponse}
// @Router /api/v1/members [post]
func (h *MemberHandler) CreateMember(c *gin.Context) {
	var input models.CreateMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	member, err := h.memberService.Create(&input)
	if err != nil {
		utils.BadRequestResponse(c, "Failed to create member", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Member created successfully", member.ToResponse())
}

// @Summary Update member
// @Description Update an existing member's details
// @Tags members
// @Accept json
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Param request body models.UpdateMemberInput true "Member update details"
// @Success 200 {object} utils.Response{data=models.MemberResponse}
// @Router /api/v1/members/{id} [put]
func (h *MemberHandler) UpdateMember(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	var input models.UpdateMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	member, err := h.memberService.Update(id, &input)
	if err != nil {
		utils.BadRequestResponse(c, "Failed to update member", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Member updated successfully", member.ToResponse())
}

// @Summary Delete member
// @Description Soft delete a member (cannot delete members with downlines)
// @Tags members
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Success 200 {object} utils.Response
// @Router /api/v1/members/{id} [delete]
func (h *MemberHandler) DeleteMember(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	if err := h.memberService.Delete(id); err != nil {
		utils.BadRequestResponse(c, "Failed to delete member", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Member deleted successfully", nil)
}

// @Summary Get member downline tree
// @Description Get the downline tree for a member
// @Tags members
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Param level query int false "Max depth level" default(10)
// @Success 200 {object} utils.Response{data=[]models.MemberWithDownlineCount}
// @Router /api/v1/members/{id}/downline [get]
func (h *MemberHandler) GetDownline(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	maxLevel := utils.GetQueryParamInt(c, "level", h.config.MLM.MaxLevels)

	downline, err := h.memberService.GetDownline(id, maxLevel)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to get downline", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Downline retrieved successfully", downline)
}

// @Summary Get member upline
// @Description Get the upline chain for a member
// @Tags members
// @Produce json
// @Security Bearer
// @Param id path string true "Member ID"
// @Param level query int false "Max depth level" default(10)
// @Success 200 {object} utils.Response{data=[]models.MemberResponse}
// @Router /api/v1/members/{id}/upline [get]
func (h *MemberHandler) GetUpline(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.BadRequestResponse(c, "Invalid member ID", err.Error())
		return
	}

	maxLevel := utils.GetQueryParamInt(c, "level", h.config.MLM.MaxLevels)

	upline, err := h.memberService.GetUpline(id, maxLevel)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to get upline", err.Error())
		return
	}

	// Convert to response objects
	responses := make([]*models.MemberResponse, len(upline))
	for i, u := range upline {
		responses[i] = u.ToResponse()
	}

	utils.SuccessResponse(c, http.StatusOK, "Upline retrieved successfully", responses)
}

// @Summary Get member stats
// @Description Get member statistics (total, active, inactive counts)
// @Tags members
// @Produce json
// @Security Bearer
// @Success 200 {object} utils.Response
// @Router /api/v1/members/stats [get]
func (h *MemberHandler) GetMemberStats(c *gin.Context) {
	stats, err := h.memberService.GetStats()
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to get member stats", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Member stats retrieved successfully", stats)
}

// @Summary Search members
// @Description Search members by keyword
// @Tags members
// @Produce json
// @Security Bearer
// @Param q query string true "Search query"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Success 200 {object} utils.Response{data=[]models.MemberResponse}
// @Router /api/v1/members/search [get]
func (h *MemberHandler) SearchMembers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		utils.BadRequestResponse(c, "Search query is required", "")
		return
	}

	page, limit := utils.GetPaginationParams(c, h.config.Pagination.DefaultLimit, h.config.Pagination.MaxLimit)

	members, total, err := h.memberService.Search(query, page, limit)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to search members", err.Error())
		return
	}

	// Convert to response objects
	responses := make([]*models.MemberResponse, len(members))
	for i, m := range members {
		responses[i] = m.ToResponse()
	}

	utils.SendPaginatedResponse(c, http.StatusOK, "Search results retrieved successfully", responses, total, page, limit)
}
