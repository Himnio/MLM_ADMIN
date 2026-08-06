package models

import (
	"time"

	"github.com/google/uuid"
)

type MemberUser struct {
	ID                 uuid.UUID `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	MemberID           string    `gorm:"column:member_id;type:varchar(20);uniqueIndex;not null" json:"member_id"`
	Username           string    `gorm:"column:username;type:varchar(100);uniqueIndex;not null" json:"username"`
	PasswordHash       string    `gorm:"column:password_hash;type:varchar(255);not null" json:"-"`
	FirstName          string    `gorm:"column:first_name;type:varchar(100);not null" json:"first_name"`
	LastName           string    `gorm:"column:last_name;type:varchar(100);not null" json:"last_name"`
	Mobile             string    `gorm:"column:mobile;type:varchar(20);not null" json:"mobile"`
	Gender             string    `gorm:"column:gender;type:varchar(10);not null" json:"gender"`
	DOB                string    `gorm:"column:dob;type:date;not null" json:"dob"`
	Address            string    `gorm:"column:address;type:text;not null" json:"address"`
	Email              string    `gorm:"column:email;type:varchar(150)" json:"email,omitempty"`
	PanCardID          string    `gorm:"column:pan_card_id;type:varchar(20)" json:"pan_card_id,omitempty"`
	AadhaarCard        string    `gorm:"column:aadhaar_card;type:varchar(20)" json:"aadhaar_card,omitempty"`
	BankAccount        string    `gorm:"column:bank_account;type:varchar(50)" json:"bank_account,omitempty"`
	BankIFSC           string    `gorm:"column:bank_ifsc;type:varchar(20)" json:"bank_ifsc,omitempty"`
	BankBranch         string    `gorm:"column:bank_branch;type:varchar(100)" json:"bank_branch,omitempty"`
	ReferralCode       string    `gorm:"column:referral_code;type:varchar(50);not null" json:"referral_code"`
	IsActive           bool      `gorm:"column:is_active;default:false" json:"is_active"`
	MustChangePassword bool      `gorm:"column:must_change_password;default:true" json:"must_change_password"`
	CreatedAt          time.Time `gorm:"column:created_at;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt          time.Time `gorm:"column:updated_at;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

func (MemberUser) TableName() string {
	return "member_users"
}

type MemberUserPublic struct {
	ID                 string `json:"id"`
	MemberID           string `json:"member_id"`
	Username           string `json:"username"`
	FirstName          string `json:"first_name"`
	LastName           string `json:"last_name"`
	Mobile             string `json:"mobile"`
	Gender             string `json:"gender"`
	DOB                string `json:"dob"`
	Address            string `json:"address"`
	Email              string `json:"email,omitempty"`
	PanCardID          string `json:"pan_card_id,omitempty"`
	AadhaarCard        string `json:"aadhaar_card,omitempty"`
	BankAccount        string `json:"bank_account,omitempty"`
	BankIFSC           string `json:"bank_ifsc,omitempty"`
	BankBranch         string `json:"bank_branch,omitempty"`
	ReferralCode       string `json:"referral_code"`
	IsActive           bool   `json:"is_active"`
	MustChangePassword bool   `json:"must_change_password"`
	CreatedAt          string `json:"created_at"`
}

func ToMemberUserPublic(u *MemberUser) *MemberUserPublic {
	if u == nil {
		return nil
	}
	return &MemberUserPublic{
		ID:                 u.ID.String(),
		MemberID:           u.MemberID,
		Username:           u.Username,
		FirstName:          u.FirstName,
		LastName:           u.LastName,
		Mobile:             u.Mobile,
		Gender:             u.Gender,
		DOB:                u.DOB,
		Address:            u.Address,
		Email:              u.Email,
		PanCardID:          u.PanCardID,
		AadhaarCard:        u.AadhaarCard,
		BankAccount:        u.BankAccount,
		BankIFSC:           u.BankIFSC,
		BankBranch:         u.BankBranch,
		ReferralCode:       u.ReferralCode,
		IsActive:           u.IsActive,
		MustChangePassword: u.MustChangePassword,
		CreatedAt:          u.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

type RegistrationResponse struct {
	MemberID string `json:"member_id"`
	Username string `json:"username"`
	Password string `json:"password"`
	Message  string `json:"message"`
}

// DistributorDownlinePublic is a downline member view WITHOUT sensitive data (PAN, Aadhaar, bank details)
type DistributorDownlinePublic struct {
	ID           string `json:"id"`
	MemberID     string `json:"member_id"`
	Username     string `json:"username"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Mobile       string `json:"mobile"`
	Gender       string `json:"gender"`
	DOB          string `json:"dob"`
	Email        string `json:"email,omitempty"`
	ReferralCode string `json:"referral_code"`
	IsActive     bool   `json:"is_active"`
	CreatedAt    string `json:"created_at"`

	// Tree info
	SponsorID     string `json:"sponsor_id,omitempty"`
	SponsorName   string `json:"sponsor_name,omitempty"`
	DownlineCount int    `json:"downline_count"`
	Level         int    `json:"level"`
}

type DistributorTreeResponse struct {
	Distributor *DistributorDownlinePublic   `json:"distributor"`
	Downlines   []*DistributorDownlinePublic `json:"downlines"`
}

type DistributorReferralInfo struct {
	ReferralCode string `json:"referral_code"`
	ReferralLink string `json:"referral_link"`
	TotalUsed    int    `json:"total_used"`
}

// DistributorLevelEntry is a distributor grouped by their tree level (1-12)
type DistributorLevelEntry struct {
	ID            string  `json:"id"`
	Level         int     `json:"level"`
	MemberID      string  `json:"member_id"`
	Username      string  `json:"username"`
	FirstName     string  `json:"first_name"`
	LastName      string  `json:"last_name"`
	Mobile        string  `json:"mobile"`
	Email         string  `json:"email,omitempty"`
	IsActive      bool    `json:"is_active"`
	CreatedAt     string  `json:"created_at"`
	DownlineCount int     `json:"downline_count"`
	TotalIncome   float64 `json:"total_income"`
}

// DistributorLevelGroup groups distributors and seats for a single level
type DistributorLevelGroup struct {
	Level                int                      `json:"level"`
	Count                int                      `json:"count"`
	FilledSeats          int                      `json:"filled_seats"`
	SeatCapacity         int                      `json:"seat_capacity"`
	IncomeAmount         float64                  `json:"income_amount"`
	CommissionPercentage float64                  `json:"commission_percentage"`
	Distributors         []*DistributorLevelEntry `json:"distributors"`
}

// DistributorsByLevelResponse wraps all level groups
type DistributorsByLevelResponse struct {
	Levels []*DistributorLevelGroup `json:"levels"`
}

func ToDistributorDownlinePublic(u *MemberUser, level int, sponsorID, sponsorName string, downlineCount int) *DistributorDownlinePublic {
	if u == nil {
		return nil
	}
	return &DistributorDownlinePublic{
		ID:            u.ID.String(),
		MemberID:      u.MemberID,
		Username:      u.Username,
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		Mobile:        u.Mobile,
		Gender:        u.Gender,
		DOB:           u.DOB,
		Email:         u.Email,
		ReferralCode:  u.ReferralCode,
		IsActive:      u.IsActive,
		CreatedAt:     u.CreatedAt.Format("2006-01-02T15:04:05Z"),
		SponsorID:     sponsorID,
		SponsorName:   sponsorName,
		DownlineCount: downlineCount,
		Level:         level,
	}
}

// UpdateMemberUserInput represents editable profile fields for a distributor.
// These fields mirror the member_users table columns that can be changed
// by an admin, by the distributor themselves, or by a distributor editing a downline member.
type UpdateMemberUserInput struct {
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Mobile       string `json:"mobile"`
	Gender       string `json:"gender"`
	DOB          string `json:"dob"`
	Address      string `json:"address"`
	Email        string `json:"email"`
	PanCardID    string `json:"pan_card_id"`
	AadhaarCard  string `json:"aadhaar_card"`
	BankAccount  string `json:"bank_account"`
	BankIFSC     string `json:"bank_ifsc"`
	BankBranch   string `json:"bank_branch"`
}

// IsEmpty reports whether no editable field was provided.
func (in *UpdateMemberUserInput) IsEmpty() bool {
	if in == nil {
		return true
	}
	return in.FirstName == "" && in.LastName == "" && in.Mobile == "" &&
		in.Gender == "" && in.DOB == "" && in.Address == "" && in.Email == "" &&
		in.PanCardID == "" && in.AadhaarCard == "" && in.BankAccount == "" &&
		in.BankIFSC == "" && in.BankBranch == ""
}
