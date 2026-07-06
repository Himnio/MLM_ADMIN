package handlers

import (
	"net/http"
	"strings"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/services"
	"mlm-admin-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ReferralLinkHandler struct {
	service services.ReferralLinkService
	config  *config.Config
	logger  *utils.Logger
}

func NewReferralLinkHandler(
	service services.ReferralLinkService,
	cfg *config.Config,
	logger *utils.Logger,
) *ReferralLinkHandler {
	return &ReferralLinkHandler{
		service: service,
		config:  cfg,
		logger:  logger,
	}
}

type createCodeRequest struct {
	CreatedByUsername string `json:"created_by_username"`
}

func (h *ReferralLinkHandler) CreateReferralCode(c *gin.Context) {
	var req createCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.BadRequestResponse(c, "Invalid request", err.Error())
		return
	}

	adminIDStr := c.GetString("admin_id")
	adminEmail := c.GetString("admin_email")

	username := strings.TrimSpace(req.CreatedByUsername)
	if username == "" {
		parts := strings.SplitN(adminEmail, "@", 2)
		username = parts[0]
	}

	var adminUUID *uuid.UUID
	if adminIDStr != "" {
		parsed, err := uuid.Parse(adminIDStr)
		if err == nil {
			adminUUID = &parsed
		}
	}

	rc, link, err := h.service.CreateReferralCode(username, adminUUID)
	if err != nil {
		h.logger.Error(err, "Failed to create referral code", nil)
		utils.InternalServerErrorResponse(c, "Failed to create referral code", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Referral code created", gin.H{
		"referral_code": rc.ReferralCode,
		"referral_link": link,
	})
}

func (h *ReferralLinkHandler) ValidateReferralCode(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"valid": false, "message": "Referral code is required"})
		return
	}

	rc, err := h.service.ValidateReferralCode(code)
	if err != nil {
		h.logger.Error(err, "Failed to validate referral code", nil)
		c.JSON(http.StatusInternalServerError, gin.H{"valid": false, "message": "Failed to validate referral code"})
		return
	}

	if rc == nil {
		c.JSON(http.StatusNotFound, gin.H{"valid": false, "message": "Referral code not found or inactive"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":         true,
		"referral_code": rc.ReferralCode,
		"created_by":    rc.CreatedByUsername,
	})
}

type registerRequest struct {
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	Mobile      string `json:"mobile"`
	Gender      string `json:"gender"`
	DOB         string `json:"dob"`
	Address     string `json:"address"`
	Email       string `json:"email"`
	PanCardID   string `json:"pan_card_id"`
	AadhaarCard string `json:"aadhaar_card"`
	BankAccount string `json:"bank_account"`
	BankIFSC    string `json:"bank_ifsc"`
	BankBranch  string `json:"bank_branch"`
}

func (h *ReferralLinkHandler) RegisterWithReferral(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Referral code is required"})
		return
	}

	rc, err := h.service.ValidateReferralCode(code)
	if err != nil {
		h.logger.Error(err, "Failed to validate referral code", nil)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Internal server error"})
		return
	}

	if rc == nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "Referral code not found or inactive"})
		return
	}

	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request body"})
		return
	}

	input := &services.MemberRegistrationInput{
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Mobile:      req.Mobile,
		Gender:      req.Gender,
		DOB:         req.DOB,
		Address:     req.Address,
		Email:       req.Email,
		PanCardID:   req.PanCardID,
		AadhaarCard: req.AadhaarCard,
		BankAccount: req.BankAccount,
		BankIFSC:    req.BankIFSC,
		BankBranch:  req.BankBranch,
	}

	result, err := h.service.RegisterWithReferral(code, input)
	if err != nil {
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "is required"),
			strings.Contains(errMsg, "invalid email"),
			strings.Contains(errMsg, "invalid PAN"),
			strings.Contains(errMsg, "invalid Aadhaar"),
			strings.Contains(errMsg, "gender must be"),
			strings.Contains(errMsg, "already registered"):
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": errMsg})
		default:
			h.logger.Error(err, "Registration failed", nil)
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Registration failed"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   result.Message,
		"member_id": result.MemberID,
		"username":  result.Username,
		"password":  result.Password,
	})
}

func (h *ReferralLinkHandler) GetRegistrations(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		utils.BadRequestResponse(c, "Referral code is required", "")
		return
	}

	rc, err := h.service.ValidateReferralCode(code)
	if err != nil {
		h.logger.Error(err, "Failed to validate referral code", nil)
		utils.InternalServerErrorResponse(c, "Internal server error", "")
		return
	}

	if rc == nil {
		utils.NotFoundResponse(c, "Referral code not found", "")
		return
	}

	users, err := h.service.GetRegistrations(code)
	if err != nil {
		h.logger.Error(err, "Failed to get registrations", nil)
		utils.InternalServerErrorResponse(c, "Failed to get registrations", "")
		return
	}

	items := make([]*models.MemberUserPublic, 0, len(users))
	for _, u := range users {
		items = append(items, models.ToMemberUserPublic(u))
	}

	utils.SuccessResponse(c, http.StatusOK, "Registrations retrieved", gin.H{
		"referral_code": code,
		"total":         len(items),
		"registrations": items,
	})
}

func (h *ReferralLinkHandler) ListReferralCodes(c *gin.Context) {
	adminIDStr := c.GetString("admin_id")
	role := c.GetString("admin_role")

	var adminUUID *uuid.UUID
	if adminIDStr != "" {
		parsed, err := uuid.Parse(adminIDStr)
		if err == nil {
			adminUUID = &parsed
		}
	}

	isSuperAdmin := role == "super_admin"

	codes, err := h.service.GetReferralCodes(adminUUID, isSuperAdmin)
	if err != nil {
		h.logger.Error(err, "Failed to list referral codes", nil)
		utils.InternalServerErrorResponse(c, "Failed to list referral codes", "")
		return
	}

	type codeItem struct {
		ID                 string `json:"id"`
		ReferralCode       string `json:"referral_code"`
		CreatedByUsername  string `json:"created_by_username"`
		CreatedAt          string `json:"created_at"`
		IsActive           bool   `json:"is_active"`
		RegistrationsCount int    `json:"registrations_count"`
	}

	items := make([]codeItem, 0, len(codes))
	for _, rc := range codes {
		regs, _ := h.service.GetRegistrations(rc.ReferralCode)
		items = append(items, codeItem{
			ID:                 rc.ID.String(),
			ReferralCode:       rc.ReferralCode,
			CreatedByUsername:  rc.CreatedByUsername,
			CreatedAt:          rc.CreatedAt.Format("2006-01-02T15:04:05Z"),
			IsActive:           rc.IsActive,
			RegistrationsCount: len(regs),
		})
	}

	utils.SuccessResponse(c, http.StatusOK, "Referral codes retrieved", gin.H{
		"codes": items,
		"total": len(items),
	})
}

func (h *ReferralLinkHandler) SearchByCreator(c *gin.Context) {
	username := c.Query("username")
	if username == "" {
		utils.BadRequestResponse(c, "username query parameter is required", "")
		return
	}

	codes, err := h.service.SearchReferralCodesByCreator(username)
	if err != nil {
		h.logger.Error(err, "Failed to search referral codes", nil)
		utils.InternalServerErrorResponse(c, "Failed to search", "")
		return
	}

	type codeResult struct {
		ReferralCode       string                    `json:"referral_code"`
		CreatedByUsername  string                    `json:"created_by_username"`
		CreatedAt          string                    `json:"created_at"`
		Registrations      []*models.MemberUserPublic `json:"registrations"`
		TotalRegistrations int                       `json:"total_registrations"`
	}

	results := make([]codeResult, 0, len(codes))
	totalAll := 0
	for _, rc := range codes {
		users, _ := h.service.GetRegistrations(rc.ReferralCode)
		items := make([]*models.MemberUserPublic, 0, len(users))
		for _, u := range users {
			items = append(items, models.ToMemberUserPublic(u))
		}
		totalAll += len(users)
		results = append(results, codeResult{
			ReferralCode:       rc.ReferralCode,
			CreatedByUsername:  rc.CreatedByUsername,
			CreatedAt:          rc.CreatedAt.Format("2006-01-02T15:04:05Z"),
			Registrations:      items,
			TotalRegistrations: len(users),
		})
	}

	utils.SuccessResponse(c, http.StatusOK, "Search results", gin.H{
		"created_by_username": username,
		"total_codes":         len(results),
		"total_registrations": totalAll,
		"results":             results,
	})
}

func (h *ReferralLinkHandler) DeleteReferralCode(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		utils.BadRequestResponse(c, "Referral code is required", "")
		return
	}

	if err := h.service.DeleteReferralCode(code); err != nil {
		if err.Error() == "referral code not found" {
			utils.NotFoundResponse(c, "Referral code not found", "")
			return
		}
		h.logger.Error(err, "Failed to delete referral code", nil)
		utils.InternalServerErrorResponse(c, "Failed to delete referral code", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Referral code deleted successfully", nil)
}
