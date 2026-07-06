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
	RegisterWithReferral(code string, input *MemberRegistrationInput) (*models.RegistrationResponse, error)
	GetRegistrations(code string) ([]*models.MemberUser, error)
	GetReferralCodes(adminID *uuid.UUID, isSuperAdmin bool) ([]*models.ReferralCode, error)
	SearchReferralCodesByCreator(username string) ([]*models.ReferralCode, error)
	DeleteReferralCode(code string) error
	GetReferralCodeByMemberUserID(memberUserID uuid.UUID) (*models.ReferralCode, error)
}

type MemberRegistrationInput struct {
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

type referralLinkService struct {
	repo       repositories.ReferralLinkRepository
	memberRepo  repositories.MemberUserRepository
	memberTreeRepo repositories.MemberRepository
	authSvc    MemberAuthService
	config     *config.Config
	logger     *utils.Logger
}

func NewReferralLinkService(
	repo repositories.ReferralLinkRepository,
	memberRepo repositories.MemberUserRepository,
	memberTreeRepo repositories.MemberRepository,
	authSvc MemberAuthService,
	cfg *config.Config,
	logger *utils.Logger,
) ReferralLinkService {
	return &referralLinkService{
		repo:           repo,
		memberRepo:     memberRepo,
		memberTreeRepo: memberTreeRepo,
		authSvc:        authSvc,
		config:         cfg,
		logger:         logger,
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

func validateRequired(value, field string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s is required", field)
	}
	return nil
}

func (s *referralLinkService) RegisterWithReferral(code string, input *MemberRegistrationInput) (*models.RegistrationResponse, error) {
	// Validate required fields
	if err := validateRequired(input.FirstName, "first_name"); err != nil {
		return nil, err
	}
	if err := validateRequired(input.LastName, "last_name"); err != nil {
		return nil, err
	}
	if err := validateRequired(input.Mobile, "mobile"); err != nil {
		return nil, err
	}
	if input.Gender != "male" && input.Gender != "female" {
		return nil, fmt.Errorf("gender must be 'male' or 'female'")
	}
	if err := validateRequired(input.DOB, "dob"); err != nil {
		return nil, err
	}
	if err := validateRequired(input.Address, "address"); err != nil {
		return nil, err
	}

	// Validate optional fields format
	if input.Email != "" {
		emailRe := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
		if !emailRe.MatchString(strings.TrimSpace(strings.ToLower(input.Email))) {
			return nil, fmt.Errorf("invalid email format")
		}
	}
	if input.PanCardID != "" {
		panRe := regexp.MustCompile(`^[A-Z]{5}[0-9]{4}[A-Z]{1}$`)
		if !panRe.MatchString(strings.TrimSpace(strings.ToUpper(input.PanCardID))) {
			return nil, fmt.Errorf("invalid PAN card format: expected 5 letters + 4 digits + 1 letter")
		}
	}
	if input.AadhaarCard != "" {
		aadhaarRe := regexp.MustCompile(`^\d{12}$`)
		if !aadhaarRe.MatchString(strings.TrimSpace(input.AadhaarCard)) {
			return nil, fmt.Errorf("invalid Aadhaar card format: expected 12 digits")
		}
	}

	// Check email uniqueness if provided
	if input.Email != "" {
		exists, err := s.memberRepo.GetByEmail(strings.TrimSpace(strings.ToLower(input.Email)))
		if err != nil {
			return nil, err
		}
		if exists != nil {
			return nil, fmt.Errorf("email already registered")
		}
	}

	// Check mobile uniqueness
	exists, err := s.memberRepo.GetByMobile(strings.TrimSpace(input.Mobile))
	if err != nil {
		return nil, err
	}
	if exists != nil {
		return nil, fmt.Errorf("mobile number already registered")
	}

	// Generate unique credentials
	creds, err := s.authSvc.GenerateUniqueCredentials(input.FirstName, input.LastName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate credentials: %w", err)
	}

	// Find the sponsor for this registration
	// The referral code used might be owned by a member_user or an admin
	var sponsorMemberID *uuid.UUID
	referralCodeRecord, err := s.repo.GetReferralCodeByCode(code)
	if err == nil && referralCodeRecord != nil {
		if referralCodeRecord.MemberUserID != nil {
			// This referral code is owned by a member_user - find their member record
			sponsorMember, err := s.memberTreeRepo.GetByMemberUserID(*referralCodeRecord.MemberUserID)
			if err == nil && sponsorMember != nil {
				sponsorMemberID = &sponsorMember.ID
			}
		}
	}

	// Create the member_user record
	user := &models.MemberUser{
		MemberID:     creds.MemberID,
		Username:     creds.Username,
		PasswordHash: creds.Hash,
		FirstName:    strings.TrimSpace(input.FirstName),
		LastName:     strings.TrimSpace(input.LastName),
		Mobile:       strings.TrimSpace(input.Mobile),
		Gender:       input.Gender,
		DOB:          input.DOB,
		Address:      strings.TrimSpace(input.Address),
		Email:        strings.TrimSpace(strings.ToLower(input.Email)),
		PanCardID:    strings.TrimSpace(strings.ToUpper(input.PanCardID)),
		AadhaarCard:  strings.TrimSpace(input.AadhaarCard),
		BankAccount:  strings.TrimSpace(input.BankAccount),
		BankIFSC:     strings.TrimSpace(strings.ToUpper(input.BankIFSC)),
		BankBranch:   strings.TrimSpace(input.BankBranch),
		ReferralCode: code,
		IsActive:     false, // New registrations are inactive by default, admin toggles
	}

	if err := s.memberRepo.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create a member record (MLM tree node) for this new distributor
	fullName := strings.TrimSpace(input.FirstName) + " " + strings.TrimSpace(input.LastName)
	member := &models.Member{
		MemberUserID: &user.ID,
		FullName:     fullName,
		Email:        strings.TrimSpace(strings.ToLower(input.Email)),
		Phone:        strings.TrimSpace(input.Mobile),
		Status:       "inactive",
		SponsorID:    sponsorMemberID,
	}
	if err := s.memberTreeRepo.Create(member); err != nil {
		// Log the error but don't fail the registration
		s.logger.Error(err, "Failed to create member tree node", map[string]interface{}{"user_id": user.ID.String()})
	}

	// Auto-generate a referral code for the new distributor
	distributorCode := slugify(fmt.Sprintf("%s_%s", input.FirstName, input.LastName)) + "_" + randomSuffix(5)
	rc := &models.ReferralCode{
		ReferralCode:      distributorCode,
		CreatedByUsername: creds.Username,
		MemberUserID:      &user.ID,
		IsActive:          true,
	}
	if err := s.repo.CreateReferralCode(rc); err != nil {
		// Log the error but don't fail the registration
		s.logger.Error(err, "Failed to create distributor referral code", map[string]interface{}{"user_id": user.ID.String()})
	}

	return &models.RegistrationResponse{
		MemberID: creds.MemberID,
		Username: creds.Username,
		Password: creds.Password,
		Message:  "Registration successful! Save your Member ID, Username, and Password.",
	}, nil
}

func (s *referralLinkService) GetRegistrations(code string) ([]*models.MemberUser, error) {
	return s.memberRepo.GetByReferralCode(code)
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

func (s *referralLinkService) GetReferralCodeByMemberUserID(memberUserID uuid.UUID) (*models.ReferralCode, error) {
	return s.repo.GetReferralCodeByMemberUserID(memberUserID)
}

func (s *referralLinkService) DeleteReferralCode(code string) error {
	rc, err := s.repo.GetReferralCodeByCode(code)
	if err != nil {
		return err
	}
	if rc == nil {
		return fmt.Errorf("referral code not found")
	}

	// Clear references in member_users before deleting the code
	if err := s.memberRepo.ClearReferralCode(code); err != nil {
		return fmt.Errorf("failed to clear referral code references: %w", err)
	}

	return s.repo.DeleteReferralCode(code)
}
