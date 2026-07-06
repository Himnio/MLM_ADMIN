package services

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"

	"mlm-admin-backend/internal/auth"
	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/repositories"
	"mlm-admin-backend/internal/utils"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type MemberAuthService interface {
	Login(loginID, password string) (*auth.TokenPair, *models.MemberUser, error)
	GetProfile(userID uuid.UUID) (*models.MemberUser, error)
	ChangePassword(userID uuid.UUID, oldPassword, newPassword string) error
	GetReferralCodeRegistrations(code string) ([]*models.MemberUser, error)
	GenerateUniqueCredentials(firstName, lastName string) (*GeneratedCredentials, error)
}

type memberAuthService struct {
	repo    repositories.MemberUserRepository
	jwtMgr  *auth.JWTManager
	config  *config.Config
	logger  *utils.Logger
}

func NewMemberAuthService(
	repo repositories.MemberUserRepository,
	jwtMgr *auth.JWTManager,
	cfg *config.Config,
	logger *utils.Logger,
) MemberAuthService {
	return &memberAuthService{
		repo:   repo,
		jwtMgr: jwtMgr,
		config: cfg,
		logger: logger,
	}
}

func (s *memberAuthService) Login(loginID, password string) (*auth.TokenPair, *models.MemberUser, error) {
	if strings.TrimSpace(loginID) == "" || strings.TrimSpace(password) == "" {
		return nil, nil, fmt.Errorf("member_id/username and password are required")
	}

	user, err := s.repo.GetByMemberIDOrUsername(strings.TrimSpace(loginID))
	if err != nil {
		return nil, nil, err
	}
	if user == nil {
		return nil, nil, fmt.Errorf("invalid credentials")
	}
	if !user.IsActive {
		return nil, nil, fmt.Errorf("account is inactive")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, fmt.Errorf("invalid credentials")
	}

	tokenPair, err := s.jwtMgr.GenerateTokenPair(user.ID, user.Email, "member")
	if err != nil {
		return nil, nil, err
	}

	return tokenPair, user, nil
}

func (s *memberAuthService) GetProfile(userID uuid.UUID) (*models.MemberUser, error) {
	return s.repo.GetByID(userID)
}

func (s *memberAuthService) ChangePassword(userID uuid.UUID, oldPassword, newPassword string) error {
	user, err := s.repo.GetByID(userID)
	if err != nil {
		return err
	}
	if user == nil {
		return fmt.Errorf("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return fmt.Errorf("current password is incorrect")
	}

	if len(newPassword) < 6 {
		return fmt.Errorf("new password must be at least 6 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.repo.UpdatePassword(userID, string(hash)); err != nil {
		return err
	}
	return s.repo.SetPasswordChanged(userID)
}

func (s *memberAuthService) GetReferralCodeRegistrations(code string) ([]*models.MemberUser, error) {
	return s.repo.GetByReferralCode(code)
}

// GenerateCredentials generates a unique member_id, username, and random password
func GenerateMemberID() string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, 6)
	for i := range result {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		result[i] = chars[n.Int64()]
	}
	return "MEM" + string(result)
}

func GenerateUsername(firstName, lastName string) string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	suffix := make([]byte, 4)
	for i := range suffix {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		suffix[i] = chars[n.Int64()]
	}
	fn := strings.ToLower(strings.TrimSpace(firstName))
	ln := strings.ToLower(strings.TrimSpace(lastName))
	replacer := strings.NewReplacer(" ", "_", "-", "_", ".", "_")
	fn = replacer.Replace(fn)
	ln = replacer.Replace(ln)
	return fmt.Sprintf("%s_%s_%s", fn, ln, string(suffix))
}

func GeneratePassword() string {
	uppers := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	lowers := "abcdefghijklmnopqrstuvwxyz"
	digits := "0123456789"
	specials := "!@#$%&"

	all := uppers + lowers + digits + specials
	seeded := make([]byte, 8)
	for i := range seeded {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(all))))
		seeded[i] = all[n.Int64()]
	}

	// Ensure at least one of each type
	firstUpper, _ := rand.Int(rand.Reader, big.NewInt(int64(len(uppers))))
	firstLower, _ := rand.Int(rand.Reader, big.NewInt(int64(len(lowers))))
	firstDigit, _ := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
	firstSpecial, _ := rand.Int(rand.Reader, big.NewInt(int64(len(specials))))

	result := string(uppers[firstUpper.Int64()]) +
		string(lowers[firstLower.Int64()]) +
		string(digits[firstDigit.Int64()]) +
		string(specials[firstSpecial.Int64()]) +
		string(seeded)

	// Shuffle by re-inserting at random positions via simple approach
	runes := []rune(result)
	for i := len(runes) - 1; i > 0; i-- {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		j := n.Int64()
		runes[i], runes[j] = runes[j], runes[i]
	}

	return string(runes)
}

// HashPassword creates a bcrypt hash of a password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// For use in credential generation - retry loop helper
type GeneratedCredentials struct {
	MemberID string
	Username string
	Password string
	Hash     string
}

// Ensure unique member_id and username with retry
func (s *memberAuthService) GenerateUniqueCredentials(firstName, lastName string) (*GeneratedCredentials, error) {
	maxAttempts := 10
	for i := 0; i < maxAttempts; i++ {
		memberID := GenerateMemberID()
		username := GenerateUsername(firstName, lastName)
		password := GeneratePassword()

		existingByID, _ := s.repo.GetByMemberID(memberID)
		existingByUser, _ := s.repo.GetByUsername(username)

		if existingByID == nil && existingByUser == nil {
			hash, err := HashPassword(password)
			if err != nil {
				return nil, fmt.Errorf("failed to hash password: %w", err)
			}
			return &GeneratedCredentials{
				MemberID: memberID,
				Username: username,
				Password: password,
				Hash:     hash,
			}, nil
		}
		// tiny sleep to avoid same random seed
		time.Sleep(time.Millisecond)
	}
	return nil, fmt.Errorf("failed to generate unique credentials after %d attempts", maxAttempts)
}
