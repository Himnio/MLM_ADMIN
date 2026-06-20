package services

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"regexp"
	"strings"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/repositories"
	"mlm-admin-backend/internal/utils"

	"github.com/google/uuid"
)

type ReferralLinkService interface {
	CreateReferralCode(createdByUsername string, adminID *uuid.UUID) (*models.ReferralCode, string, error)
	ValidateReferralCode(code string) (*models.ReferralCode, error)
	RegisterWithReferral(code string, input *ReferralRegistrationInput) (*models.ReferralRegistration, error)
	GetRegistrations(code string) ([]*models.ReferralRegistration, error)
	GetReferralCodes(adminID *uuid.UUID, isSuperAdmin bool) ([]*models.ReferralCode, error)
	SearchReferralCodesByCreator(username string) ([]*models.ReferralCode, error)
	DeleteReferralCode(code string) error
}

type ReferralRegistrationInput struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	PanCardID string `json:"pan_card_id"`
	FullName string `json:"full_name"`
}

type referralLinkService struct {
	repo   repositories.ReferralLinkRepository
	config *config.Config
	logger *utils.Logger
}

func NewReferralLinkService(
	repo repositories.ReferralLinkRepository,
	cfg *config.Config,
	logger *utils.Logger,
) ReferralLinkService {
	return &referralLinkService{
		repo:   repo,
		config: cfg,
		logger: logger,
	}
}

var alphanumeric = []rune("abcdefghijklmnopqrstuvwxyz0123456789")

func randomSuffix(length int) string {
	result := make([]rune, length)
	for i := range result {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphanumeric))))
		if err != nil {
			result[i] = 'x'
			continue
		}
		result[i] = alphanumeric[n.Int64()]
	}
	return string(result)
}

func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, " ", "_")
	re := regexp.MustCompile(`[^a-z0-9_-]`)
	s = re.ReplaceAllString(s, "")
	return s
}

func (s *referralLinkService) CreateReferralCode(createdByUsername string, adminID *uuid.UUID) (*models.ReferralCode, string, error) {
	slug := slugify(createdByUsername)
	suffix := randomSuffix(5)
	referralCode := fmt.Sprintf("%s_%s", slug, suffix)

	rc := &models.ReferralCode{
		ReferralCode:      referralCode,
		CreatedByUsername: createdByUsername,
		AdminID:           adminID,
		IsActive:          true,
	}

	if err := s.repo.CreateReferralCode(rc); err != nil {
		return nil, "", err
	}

	referralLink := fmt.Sprintf("%s/register?ref=%s", s.config.App.FrontendURL, referralCode)

	return rc, referralLink, nil
}

func (s *referralLinkService) ValidateReferralCode(code string) (*models.ReferralCode, error) {
	rc, err := s.repo.GetReferralCodeByCode(code)
	if err != nil {
		return nil, err
	}
	if rc == nil || !rc.IsActive {
		return nil, nil
	}
	return rc, nil
}

var panCardRe = regexp.MustCompile(`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`)
var emailRe = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

func (s *referralLinkService) RegisterWithReferral(code string, input *ReferralRegistrationInput) (*models.ReferralRegistration, error) {
	if strings.TrimSpace(input.Name) == "" {
		return nil, fmt.Errorf("name is required")
	}
	if strings.TrimSpace(input.Username) == "" {
		return nil, fmt.Errorf("username is required")
	}
	if strings.TrimSpace(input.Email) == "" {
		return nil, fmt.Errorf("email is required")
	}
	if strings.TrimSpace(input.PanCardID) == "" {
		return nil, fmt.Errorf("pan_card_id is required")
	}
	if strings.TrimSpace(input.FullName) == "" {
		return nil, fmt.Errorf("full_name is required")
	}

	email := strings.TrimSpace(strings.ToLower(input.Email))
	if !emailRe.MatchString(email) {
		return nil, fmt.Errorf("invalid email format")
	}

	panCard := strings.TrimSpace(strings.ToUpper(input.PanCardID))
	if !panCardRe.MatchString(panCard) {
		return nil, fmt.Errorf("invalid PAN card format: expected 5 letters + 4 digits + 1 letter")
	}

	exists, err := s.repo.CheckUsernameExists(strings.TrimSpace(input.Username))
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("username already registered")
	}

	exists, err = s.repo.CheckEmailExists(email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("email already registered")
	}

	reg := &models.ReferralRegistration{
		ReferralCode: code,
		Name:         strings.TrimSpace(input.Name),
		Username:     strings.TrimSpace(input.Username),
		Email:        email,
		PanCardID:    panCard,
		FullName:     strings.TrimSpace(input.FullName),
	}

	if err := s.repo.CreateRegistration(reg); err != nil {
		return nil, err
	}

	return reg, nil
}

func (s *referralLinkService) GetRegistrations(code string) ([]*models.ReferralRegistration, error) {
	regs, err := s.repo.GetRegistrationsByReferralCode(code)
	if err != nil {
		return nil, err
	}
	return regs, nil
}

func (s *referralLinkService) GetReferralCodes(adminID *uuid.UUID, isSuperAdmin bool) ([]*models.ReferralCode, error) {
	if isSuperAdmin {
		return s.repo.GetAllReferralCodes()
	}
	if adminID != nil {
		return s.repo.GetReferralCodesByAdminID(*adminID)
	}
	return []*models.ReferralCode{}, nil
}

func (s *referralLinkService) SearchReferralCodesByCreator(username string) ([]*models.ReferralCode, error) {
	return s.repo.SearchReferralCodesByCreator(username)
}

func (s *referralLinkService) DeleteReferralCode(code string) error {
	rc, err := s.repo.GetReferralCodeByCode(code)
	if err != nil {
		return err
	}
	if rc == nil {
		return fmt.Errorf("referral code not found")
	}
	return s.repo.DeleteReferralCode(code)
}
