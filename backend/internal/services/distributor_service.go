package services

import (
	"fmt"

	"rudra-admin-backend/internal/config"
	"rudra-admin-backend/internal/models"
	"rudra-admin-backend/internal/repositories"
	"rudra-admin-backend/internal/utils"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type DistributorService interface {
	GetDashboard(memberUserID uuid.UUID) (map[string]interface{}, error)
	GetDownline(memberUserID uuid.UUID) ([]*models.DistributorDownlinePublic, error)
	GetReferralInfo(memberUserID uuid.UUID) (*models.DistributorReferralInfo, error)
	GetAllDistributors(page, limit int) ([]*models.MemberUserPublic, int64, error)
	ToggleActive(memberUserID uuid.UUID) error
	GetDistributorTree(memberUserID uuid.UUID) (*models.DistributorTreeResponse, error)
	DeleteDistributor(memberUserID uuid.UUID) error
	GetDownlineByMemberUserID(memberUserID uuid.UUID) ([]*models.DistributorDownlinePublic, error)
	AdminResetPassword(memberUserID uuid.UUID, newPassword string) error
}

type distributorService struct {
	memberUserRepo   repositories.MemberUserRepository
	memberTreeRepo   repositories.MemberRepository
	referralLinkRepo repositories.ReferralLinkRepository
	config           *config.Config
	logger           *utils.Logger
}

func NewDistributorService(
	memberUserRepo repositories.MemberUserRepository,
	memberTreeRepo repositories.MemberRepository,
	referralLinkRepo repositories.ReferralLinkRepository,
	cfg *config.Config,
	logger *utils.Logger,
) DistributorService {
	return &distributorService{
		memberUserRepo:   memberUserRepo,
		memberTreeRepo:   memberTreeRepo,
		referralLinkRepo: referralLinkRepo,
		config:           cfg,
		logger:           logger,
	}
}

func (s *distributorService) GetDashboard(memberUserID uuid.UUID) (map[string]interface{}, error) {
	user, err := s.memberUserRepo.GetByID(memberUserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("distributor not found")
	}

	member, err := s.memberTreeRepo.GetByMemberUserID(memberUserID)
	if err != nil {
		return nil, err
	}

	downlineCount := 0
	if member != nil {
		downlineCount, _ = s.memberTreeRepo.GetDownlineCount(member.ID)
	}

	referralCode, _ := s.referralLinkRepo.GetReferralCodeByMemberUserID(memberUserID)
	totalUsed := int64(0)
	if referralCode != nil {
		totalUsed, _ = s.memberUserRepo.CountByReferralCode(referralCode.ReferralCode)
	}

	referralCodeStr := ""
	if referralCode != nil {
		referralCodeStr = referralCode.ReferralCode
	}

	return map[string]interface{}{
		"member_id":      user.MemberID,
		"username":       user.Username,
		"first_name":     user.FirstName,
		"last_name":      user.LastName,
		"mobile":         user.Mobile,
		"email":          user.Email,
		"is_active":      user.IsActive,
		"downline_count": downlineCount,
		"referral_used":  totalUsed,
		"referral_code":  referralCodeStr,
	}, nil
}

func (s *distributorService) GetDownline(memberUserID uuid.UUID) ([]*models.DistributorDownlinePublic, error) {
	member, err := s.memberTreeRepo.GetByMemberUserID(memberUserID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return []*models.DistributorDownlinePublic{}, nil
	}

	downlineMembers, err := s.memberTreeRepo.GetDownline(member.ID, 10)
	if err != nil {
		return nil, err
	}

	result := make([]*models.DistributorDownlinePublic, 0, len(downlineMembers))
	for _, dm := range downlineMembers {
		if dm.MemberUserID == nil {
			continue
		}
		mu, err := s.memberUserRepo.GetByID(*dm.MemberUserID)
		if err != nil || mu == nil {
			continue
		}
		sponsorName := ""
		if dm.Sponsor != nil {
			sponsorName = dm.Sponsor.FullName
		}
		dc, _ := s.memberTreeRepo.GetDownlineCount(dm.ID)
		level := 0
		_ = level // TODO: calculate actual level in tree
		result = append(result, models.ToDistributorDownlinePublic(mu, level, dm.SponsorID.String(), sponsorName, dc))
	}
	return result, nil
}

func (s *distributorService) GetReferralInfo(memberUserID uuid.UUID) (*models.DistributorReferralInfo, error) {
	user, err := s.memberUserRepo.GetByID(memberUserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("distributor not found")
	}

	rc, err := s.referralLinkRepo.GetReferralCodeByMemberUserID(memberUserID)
	if err != nil {
		return nil, err
	}
	if rc == nil {
		// No referral code yet - shouldn't happen since we auto-create on registration
		return &models.DistributorReferralInfo{
			ReferralCode: "",
			ReferralLink: "",
			TotalUsed:    0,
		}, nil
	}

	frontendURL := s.config.App.FrontendURL
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	link := fmt.Sprintf("%s/register?ref=%s", frontendURL, rc.ReferralCode)

	totalUsed, _ := s.memberUserRepo.CountByReferralCode(rc.ReferralCode)

	return &models.DistributorReferralInfo{
		ReferralCode: rc.ReferralCode,
		ReferralLink: link,
		TotalUsed:    int(totalUsed),
	}, nil
}

func (s *distributorService) GetAllDistributors(page, limit int) ([]*models.MemberUserPublic, int64, error) {
	users, total, err := s.memberUserRepo.GetAll(page, limit)
	if err != nil {
		return nil, 0, err
	}
	result := make([]*models.MemberUserPublic, 0, len(users))
	for _, u := range users {
		result = append(result, models.ToMemberUserPublic(u))
	}
	return result, total, nil
}

func (s *distributorService) ToggleActive(memberUserID uuid.UUID) error {
	return s.memberUserRepo.ToggleActive(memberUserID)
}

func (s *distributorService) GetDownlineByMemberUserID(memberUserID uuid.UUID) ([]*models.DistributorDownlinePublic, error) {
	member, err := s.memberTreeRepo.GetByMemberUserID(memberUserID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return []*models.DistributorDownlinePublic{}, nil
	}

	downlineMembers, err := s.memberTreeRepo.GetImmediateDownline(member.ID)
	if err != nil {
		return nil, err
	}

	result := make([]*models.DistributorDownlinePublic, 0, len(downlineMembers))
	for _, dm := range downlineMembers {
		if dm.MemberUserID == nil {
			continue
		}
		mu, err := s.memberUserRepo.GetByID(*dm.MemberUserID)
		if err != nil || mu == nil {
			continue
		}
		sponsorName := ""
		if dm.Sponsor != nil {
			sponsorName = dm.Sponsor.FullName
		}
		dc, _ := s.memberTreeRepo.GetDownlineCount(dm.ID)
		result = append(result, models.ToDistributorDownlinePublic(mu, 1, dm.SponsorID.String(), sponsorName, dc))
	}
	return result, nil
}

func (s *distributorService) DeleteDistributor(memberUserID uuid.UUID) error {
	user, err := s.memberUserRepo.GetByID(memberUserID)
	if err != nil {
		return err
	}
	if user == nil {
		return fmt.Errorf("distributor not found")
	}

	// Hard delete the member tree record (cascades to incomes, referrals, etc.)
	if err := s.memberTreeRepo.HardDeleteByMemberUserID(memberUserID); err != nil {
		s.logger.Error(err, "Failed to delete member tree record", map[string]interface{}{"member_user_id": memberUserID.String()})
	}

	// Delete referral codes owned by this distributor
	if err := s.referralLinkRepo.DeleteByMemberUserID(memberUserID); err != nil {
		s.logger.Error(err, "Failed to delete distributor referral codes", map[string]interface{}{"member_user_id": memberUserID.String()})
	}

	// Delete the member_user record
	return s.memberUserRepo.DeleteByID(memberUserID)
}

func (s *distributorService) GetDistributorTree(memberUserID uuid.UUID) (*models.DistributorTreeResponse, error) {
	user, err := s.memberUserRepo.GetByID(memberUserID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, fmt.Errorf("distributor not found")
	}

	member, err := s.memberTreeRepo.GetByMemberUserID(memberUserID)
	if err != nil {
		return nil, err
	}

	dc := 0
	if member != nil {
		dc, _ = s.memberTreeRepo.GetDownlineCount(member.ID)
	}

	distributor := models.ToDistributorDownlinePublic(user, 0, "", "", dc)

	downlines, err := s.GetDownline(memberUserID)
	if err != nil {
		return nil, err
	}

	return &models.DistributorTreeResponse{
		Distributor: distributor,
		Downlines:   downlines,
	}, nil
}

func (s *distributorService) AdminResetPassword(memberUserID uuid.UUID, newPassword string) error {
	user, err := s.memberUserRepo.GetByID(memberUserID)
	if err != nil {
		return err
	}
	if user == nil {
		return fmt.Errorf("distributor not found")
	}

	if len(newPassword) < 6 {
		return fmt.Errorf("new password must be at least 6 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.memberUserRepo.UpdatePassword(memberUserID, string(hash)); err != nil {
		return err
	}
	return s.memberUserRepo.SetPasswordMustChange(memberUserID)
}
