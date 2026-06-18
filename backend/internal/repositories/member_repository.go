package repositories

import (
	"errors"

	"mlm-admin-backend/internal/database"
	"mlm-admin-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MemberRepository handles database operations for members
type MemberRepository interface {
	Create(member *models.Member) error
	GetByID(id uuid.UUID) (*models.Member, error)
	GetByMemberCode(code string) (*models.Member, error)
	GetByEmail(email string) (*models.Member, error)
	Update(member *models.Member) error
	Delete(id uuid.UUID) error
	List(filter *models.MemberFilter, page, limit int) ([]*models.Member, int64, error)
	GetDownline(sponsorID uuid.UUID, maxLevel int) ([]*models.Member, error)
	GetUpline(memberID uuid.UUID, maxLevel int) ([]*models.Member, error)
	GetDownlineCount(memberID uuid.UUID) (int, error)
	GetTotalReferrals() (int64, error)
	GetActiveMemberCount() (int64, error)
	CheckCircularReference(sponsorID, memberID uuid.UUID) (bool, error)
}

type memberRepository struct {
	db *database.PostgresDB
}

// NewMemberRepository creates a new member repository
func NewMemberRepository(db *database.PostgresDB) MemberRepository {
	return &memberRepository{db: db}
}

// Create creates a new member
func (r *memberRepository) Create(member *models.Member) error {
	return r.db.DB.Create(member).Error
}

// GetByID retrieves a member by ID
func (r *memberRepository) GetByID(id uuid.UUID) (*models.Member, error) {
	var member models.Member
	err := r.db.DB.Preload("Sponsor").Where("id = ?", id).First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &member, nil
}

// GetByMemberCode retrieves a member by their member code
func (r *memberRepository) GetByMemberCode(code string) (*models.Member, error) {
	var member models.Member
	err := r.db.DB.Where("member_code = ?", code).First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &member, nil
}

// GetByEmail retrieves a member by email
func (r *memberRepository) GetByEmail(email string) (*models.Member, error) {
	var member models.Member
	err := r.db.DB.Where("email = ?", email).First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &member, nil
}

// Update updates a member
func (r *memberRepository) Update(member *models.Member) error {
	return r.db.DB.Save(member).Error
}

// Delete soft deletes a member
func (r *memberRepository) Delete(id uuid.UUID) error {
	return r.db.DB.Delete(&models.Member{}, id).Error
}

// List retrieves members with pagination and filtering
func (r *memberRepository) List(filter *models.MemberFilter, page, limit int) ([]*models.Member, int64, error) {
	var members []*models.Member
	var total int64

	query := r.db.DB.Model(&models.Member{})

	// Apply filters
	if filter != nil {
		if filter.Status != nil {
			query = query.Where("status = ?", *filter.Status)
		}
		if filter.SponsorID != nil {
			query = query.Where("sponsor_id = ?", *filter.SponsorID)
		}
		if filter.Email != nil {
			query = query.Where("email = ?", *filter.Email)
		}
		if filter.Phone != nil {
			query = query.Where("phone = ?", *filter.Phone)
		}
		if filter.FromDate != nil {
			query = query.Where("joined_at >= ?", *filter.FromDate)
		}
		if filter.ToDate != nil {
			query = query.Where("joined_at <= ?", *filter.ToDate)
		}
		if filter.Search != nil {
			searchPattern := "%" + *filter.Search + "%"
			query = query.Where(
				"full_name LIKE ? OR member_code LIKE ? OR email LIKE ? OR phone LIKE ?",
				searchPattern, searchPattern, searchPattern, searchPattern,
			)
		}
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (page - 1) * limit
	err := query.Preload("Sponsor").
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&members).Error
	if err != nil {
		return nil, 0, err
	}

	return members, total, nil
}

// GetDownline retrieves all downline members for a sponsor using recursive CTE
func (r *memberRepository) GetDownline(sponsorID uuid.UUID, maxLevel int) ([]*models.Member, error) {
	var members []*models.Member

	query := `
		WITH RECURSIVE downline_tree AS (
			-- Base case: direct referrals
			SELECT m.*, 1 as level
			FROM members m
			WHERE m.sponsor_id = ? AND m.deleted_at IS NULL
			
			UNION ALL
			
			-- Recursive case: indirect referrals
			SELECT m.*, dt.level + 1
			FROM members m
			INNER JOIN downline_tree dt ON m.sponsor_id = dt.id
			WHERE m.deleted_at IS NULL AND dt.level < ?
		)
		SELECT * FROM downline_tree ORDER BY level, created_at DESC
	`

	err := r.db.DB.Raw(query, sponsorID, maxLevel).Scan(&members).Error
	if err != nil {
		return nil, err
	}

	return members, nil
}

// GetUpline retrieves all upline members for a member using recursive CTE
func (r *memberRepository) GetUpline(memberID uuid.UUID, maxLevel int) ([]*models.Member, error) {
	var members []*models.Member

	query := `
		WITH RECURSIVE upline_tree AS (
			-- Base case: direct sponsor
			SELECT m.*, 1 as level
			FROM members m
			INNER JOIN members target ON target.sponsor_id = m.id
			WHERE target.id = ? AND m.deleted_at IS NULL
			
			UNION ALL
			
			-- Recursive case: sponsor's sponsor
			SELECT m.*, ut.level + 1
			FROM members m
			INNER JOIN upline_tree ut ON m.id = ut.sponsor_id
			WHERE m.deleted_at IS NULL AND ut.level < ?
		)
		SELECT * FROM upline_tree ORDER BY level
	`

	err := r.db.DB.Raw(query, memberID, maxLevel).Scan(&members).Error
	if err != nil {
		return nil, err
	}

	return members, nil
}

// GetDownlineCount returns the total downline count for a member
func (r *memberRepository) GetDownlineCount(memberID uuid.UUID) (int, error) {
	var count int64
	err := r.db.DB.Model(&models.Member{}).
		Where("sponsor_id = ?", memberID).
		Count(&count).Error
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

// GetTotalReferrals returns total number of members
func (r *memberRepository) GetTotalReferrals() (int64, error) {
	var count int64
	err := r.db.DB.Model(&models.Member{}).Count(&count).Error
	return count, err
}

// GetActiveMemberCount returns count of active members
func (r *memberRepository) GetActiveMemberCount() (int64, error) {
	var count int64
	err := r.db.DB.Model(&models.Member{}).
		Where("status = ?", "active").
		Count(&count).Error
	return count, err
}

// CheckCircularReference checks if assigning sponsor_id would create a circular reference
func (r *memberRepository) CheckCircularReference(sponsorID, memberID uuid.UUID) (bool, error) {
	var count int64

	query := `
		WITH RECURSIVE sponsor_chain AS (
			SELECT id, sponsor_id, 0 as depth
			FROM members
			WHERE id = ?
			
			UNION ALL
			
			SELECT m.id, m.sponsor_id, sc.depth + 1
			FROM members m
			INNER JOIN sponsor_chain sc ON m.id = sc.sponsor_id
			WHERE sc.depth < 100
		)
		SELECT COUNT(*) FROM sponsor_chain WHERE id = ?
	`

	err := r.db.DB.Raw(query, sponsorID, memberID).Scan(&count).Error
	if err != nil {
		return false, err
	}

	return count > 0, nil
}
