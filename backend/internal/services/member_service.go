package services

import (
	"errors"
	"fmt"
	"time"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/repositories"
	"mlm-admin-backend/internal/utils"

	"github.com/google/uuid"
)

// MemberService handles member business logic
type MemberService interface {
	Create(input *models.CreateMemberInput) (*models.Member, error)
	GetByID(id uuid.UUID) (*models.Member, error)
	GetByMemberCode(code string) (*models.Member, error)
	Update(id uuid.UUID, input *models.UpdateMemberInput) (*models.Member, error)
	Delete(id uuid.UUID) error
	List(filter *models.MemberFilter, page, limit int) ([]*models.Member, int64, error)
	GetDownline(id uuid.UUID, maxLevel int) ([]*models.MemberWithDownlineCount, error)
	GetUpline(id uuid.UUID, maxLevel int) ([]*models.Member, error)
	GetDownlineCount(id uuid.UUID) (*models.MemberWithDownlineCount, error)
	GetStats() (map[string]interface{}, error)
	Search(query string, page, limit int) ([]*models.Member, int64, error)
}

type memberService struct {
	memberRepo repositories.MemberRepository
	config     *config.Config
	logger     *utils.Logger
}

// NewMemberService creates a new member service
func NewMemberService(
	memberRepo repositories.MemberRepository,
	cfg *config.Config,
	logger *utils.Logger,
) MemberService {
	return &memberService{
		memberRepo: memberRepo,
		config:     cfg,
		logger:     logger,
	}
}

// Create creates a new member
func (s *memberService) Create(input *models.CreateMemberInput) (*models.Member, error) {
	// Validate required fields
	if input.FullName == "" {
		return nil, errors.New("full name is required")
	}

	// Handle sponsor
	var sponsorID *uuid.UUID
	if input.SponsorID != "" {
		parsedID, err := uuid.Parse(input.SponsorID)
		if err != nil {
			return nil, errors.New("invalid sponsor ID format")
		}

		// Verify sponsor exists
		sponsor, err := s.memberRepo.GetByID(parsedID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify sponsor: %w", err)
		}
		if sponsor == nil {
			return nil, errors.New("sponsor not found")
		}
		sponsorID = &parsedID
	}

	// Check if email already exists
	if input.Email != "" {
		existing, err := s.memberRepo.GetByEmail(input.Email)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, errors.New("email already registered")
		}
	}

	// Create member
	member := &models.Member{
		SponsorID: sponsorID,
		FullName:  input.FullName,
		Email:     input.Email,
		Phone:     input.Phone,
		Status:    string(models.StatusActive),
		JoinedAt:  time.Now(),
	}

	if err := s.memberRepo.Create(member); err != nil {
		s.logger.Error(err, "Failed to create member", nil)
		return nil, fmt.Errorf("failed to create member: %w", err)
	}

	// Retrieve member with sponsor data
	return s.memberRepo.GetByID(member.ID)
}

// GetByID retrieves a member by ID
func (s *memberService) GetByID(id uuid.UUID) (*models.Member, error) {
	member, err := s.memberRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("member not found")
	}
	return member, nil
}

// GetByMemberCode retrieves a member by member code
func (s *memberService) GetByMemberCode(code string) (*models.Member, error) {
	member, err := s.memberRepo.GetByMemberCode(code)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("member not found")
	}
	return member, nil
}

// Update updates a member
func (s *memberService) Update(id uuid.UUID, input *models.UpdateMemberInput) (*models.Member, error) {
	// Get existing member
	member, err := s.memberRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("member not found")
	}

	// Update fields
	if input.FullName != nil {
		member.FullName = *input.FullName
	}
	if input.Email != nil {
		// Check if new email is taken
		if *input.Email != member.Email {
			existing, err := s.memberRepo.GetByEmail(*input.Email)
			if err != nil {
				return nil, err
			}
			if existing != nil {
				return nil, errors.New("email already in use")
			}
		}
		member.Email = *input.Email
	}
	if input.Phone != nil {
		member.Phone = *input.Phone
	}
	if input.Status != nil {
		member.Status = *input.Status
	}

	if err := s.memberRepo.Update(member); err != nil {
		return nil, fmt.Errorf("failed to update member: %w", err)
	}

	return s.memberRepo.GetByID(member.ID)
}

// Delete soft deletes a member
func (s *memberService) Delete(id uuid.UUID) error {
	member, err := s.memberRepo.GetByID(id)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("member not found")
	}

	// Check if member has downlines
	downlineCount, err := s.memberRepo.GetDownlineCount(id)
	if err != nil {
		return err
	}
	if downlineCount > 0 {
		return errors.New("cannot delete member with active downlines")
	}

	return s.memberRepo.Delete(id)
}

// List retrieves paginated list of members
func (s *memberService) List(filter *models.MemberFilter, page, limit int) ([]*models.Member, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > s.config.Pagination.MaxLimit {
		limit = s.config.Pagination.DefaultLimit
	}

	return s.memberRepo.List(filter, page, limit)
}

// GetDownline retrieves the downline tree for a member
func (s *memberService) GetDownline(id uuid.UUID, maxLevel int) ([]*models.MemberWithDownlineCount, error) {
	member, err := s.memberRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("member not found")
	}

	if maxLevel < 1 || maxLevel > s.config.MLM.MaxLevels {
		maxLevel = s.config.MLM.MaxLevels
	}

	downline, err := s.memberRepo.GetDownline(id, maxLevel)
	if err != nil {
		return nil, err
	}

	// Enrich with downline counts
	result := make([]*models.MemberWithDownlineCount, len(downline))
	for i, d := range downline {
		count, err := s.memberRepo.GetDownlineCount(d.ID)
		if err != nil {
			return nil, err
		}
		result[i] = &models.MemberWithDownlineCount{
			MemberResponse: d.ToResponse(),
			DownlineCount:  count,
		}
	}

	return result, nil
}

// GetUpline retrieves the upline chain for a member
func (s *memberService) GetUpline(id uuid.UUID, maxLevel int) ([]*models.Member, error) {
	member, err := s.memberRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("member not found")
	}

	if maxLevel < 1 || maxLevel > s.config.MLM.MaxLevels {
		maxLevel = s.config.MLM.MaxLevels
	}

	return s.memberRepo.GetUpline(id, maxLevel)
}

// GetDownlineCount returns downline summary for a member
func (s *memberService) GetDownlineCount(id uuid.UUID) (*models.MemberWithDownlineCount, error) {
	member, err := s.memberRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("member not found")
	}

	totalCount, err := s.memberRepo.GetDownlineCount(id)
	if err != nil {
		return nil, err
	}

	return &models.MemberWithDownlineCount{
		MemberResponse: member.ToResponse(),
		DownlineCount:  totalCount,
	}, nil
}

// GetStats returns member statistics
func (s *memberService) GetStats() (map[string]interface{}, error) {
	total, err := s.memberRepo.GetTotalReferrals()
	if err != nil {
		return nil, err
	}

	active, err := s.memberRepo.GetActiveMemberCount()
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_members":    total,
		"active_members":   active,
		"inactive_members": total - active,
		"total_downlines":  total, // simplified
	}, nil
}

// Search searches members by query string
func (s *memberService) Search(query string, page, limit int) ([]*models.Member, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > s.config.Pagination.MaxLimit {
		limit = s.config.Pagination.DefaultLimit
	}

	filter := &models.MemberFilter{
		Search: &query,
	}
	return s.memberRepo.List(filter, page, limit)
}
