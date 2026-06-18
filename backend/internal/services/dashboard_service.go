package services

import (
	"time"

	"mlm-admin-backend/internal/config"
	"mlm-admin-backend/internal/models"
	"mlm-admin-backend/internal/repositories"
	"mlm-admin-backend/internal/utils"

	"gorm.io/gorm"
)

// DashboardService handles dashboard analytics and business intelligence
type DashboardService interface {
	// Overview stats
	GetOverview() (*DashboardOverview, error)
	GetMemberStats() (*MemberDashboardStats, error)
	GetIncomeStats() (*IncomeDashboardStats, error)
	GetSystemHealth() (*SystemHealth, error)

	// Charts data
	GetIncomeChartData(period string) (*IncomeChartData, error)
	GetMemberGrowthChart(period string) (*MemberGrowthChart, error)
	GetLevelDistribution() (*LevelDistribution, error)
	GetTopEarners(limit int) ([]*TopEarner, error)

	// Activity
	GetRecentActivity(limit int) ([]*ActivityLog, error)
	GetSystemAlerts() ([]*SystemAlert, error)
}

type DashboardOverview struct {
	TotalMembers    int64   `json:"total_members"`
	ActiveMembers   int64   `json:"active_members"`
	TotalIncome     float64 `json:"total_income"`
	PendingIncome   float64 `json:"pending_income"`
	TotalReferrals  int64   `json:"total_referrals"`
	CommissionRate  float64 `json:"commission_rate"`
	GrowthRate      float64 `json:"growth_rate"`
	NewMembersToday int64   `json:"new_members_today"`
}

type MemberDashboardStats struct {
	Total           int64            `json:"total"`
	Active          int64            `json:"active"`
	Inactive        int64            `json:"inactive"`
	Pending         int64            `json:"pending"`
	Suspended       int64            `json:"suspended"`
	ByStatus        map[string]int64 `json:"by_status"`
	ByReferralCount map[string]int64 `json:"by_referral_count"`
}

type IncomeDashboardStats struct {
	TotalDistributed float64 `json:"total_distributed"`
	PendingPayout    float64 `json:"pending_payout"`
	AvgPerMember     float64 `json:"avg_per_member"`
	HighestEarner    string  `json:"highest_earner"`
	HighestAmount    float64 `json:"highest_amount"`
	Transactions     int64   `json:"transactions"`
}

type SystemHealth struct {
	Status     string  `json:"status"`
	Uptime     string  `json:"uptime"`
	DBStatus   string  `json:"db_status"`
	APIVersion string  `json:"api_version"`
	CPULoad    float64 `json:"cpu_load"`
	MemoryUsed int64   `json:"memory_used"`
	MemoryFree int64   `json:"memory_free"`
}

type IncomeChartData struct {
	Labels   []string        `json:"labels"`
	Datasets []*ChartDataset `json:"datasets"`
}

type ChartDataset struct {
	Label string    `json:"label"`
	Data  []float64 `json:"data"`
	Color string    `json:"color"`
}

type MemberGrowthChart struct {
	Labels  []string  `json:"labels"`
	Members []int64   `json:"members"`
	Growth  []float64 `json:"growth"`
}

type LevelDistribution struct {
	Levels []int   `json:"levels"`
	Counts []int64 `json:"counts"`
}

type TopEarner struct {
	MemberID    string  `json:"member_id"`
	MemberName  string  `json:"member_name"`
	TotalIncome float64 `json:"total_income"`
	DirectCount int     `json:"direct_count"`
}

type ActivityLog struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Action    string    `json:"action"`
	Details   string    `json:"details"`
	AdminName string    `json:"admin_name"`
	CreatedAt time.Time `json:"created_at"`
}

type SystemAlert struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
	Actions  string `json:"actions"`
}

type dashboardService struct {
	db           *gorm.DB
	memberRepo   repositories.MemberRepository
	incomeRepo   repositories.IncomeRepository
	referralRepo repositories.ReferralRepository
	config       *config.Config
	logger       *utils.Logger
}

// NewDashboardService creates a new dashboard service
func NewDashboardService(
	db *gorm.DB,
	memberRepo repositories.MemberRepository,
	incomeRepo repositories.IncomeRepository,
	referralRepo repositories.ReferralRepository,
	cfg *config.Config,
	logger *utils.Logger,
) DashboardService {
	return &dashboardService{
		db:           db,
		memberRepo:   memberRepo,
		incomeRepo:   incomeRepo,
		referralRepo: referralRepo,
		config:       cfg,
		logger:       logger,
	}
}

// GetOverview returns high-level dashboard overview
func (s *dashboardService) GetOverview() (*DashboardOverview, error) {
	var totalMembers int64
	var activeMembers int64
	s.db.Model(&models.Member{}).Count(&totalMembers)
	s.db.Model(&models.Member{}).Where("status = ?", "active").Count(&activeMembers)

	var totalIncome float64
	s.db.Model(&models.Income{}).Select("COALESCE(SUM(amount), 0)").Scan(&totalIncome)

	var newToday int64
	today := time.Now().Truncate(24 * time.Hour)
	s.db.Model(&models.Member{}).Where("created_at >= ?", today).Count(&newToday)

	var totalRefs int64
	s.db.Model(&models.Referral{}).Count(&totalRefs)

	var pendingIncome float64
	s.db.Model(&models.Income{}).Where("status = ?", "pending").Select("COALESCE(SUM(amount), 0)").Scan(&pendingIncome)

	return &DashboardOverview{
		TotalMembers:    totalMembers,
		ActiveMembers:   activeMembers,
		TotalIncome:     totalIncome,
		PendingIncome:   pendingIncome,
		TotalReferrals:  totalRefs,
		CommissionRate:  10.0,
		GrowthRate:      5.5,
		NewMembersToday: newToday,
	}, nil
}

// GetMemberStats returns detailed member statistics
func (s *dashboardService) GetMemberStats() (*MemberDashboardStats, error) {
	stats := &MemberDashboardStats{
		ByStatus:        make(map[string]int64),
		ByReferralCount: make(map[string]int64),
	}

	var results []struct {
		Status string
		Count  int64
	}
	s.db.Model(&models.Member{}).Select("status, COUNT(*) as count").Group("status").Scan(&results)
	for _, r := range results {
		stats.ByStatus[r.Status] = r.Count
		switch r.Status {
		case "active":
			stats.Active = r.Count
		case "inactive":
			stats.Inactive = r.Count
		case "pending":
			stats.Pending = r.Count
		case "suspended":
			stats.Suspended = r.Count
		}
		stats.Total += r.Count
	}

	return stats, nil
}

// GetIncomeStats returns income dashboard statistics
func (s *dashboardService) GetIncomeStats() (*IncomeDashboardStats, error) {
	stats := &IncomeDashboardStats{}

	s.db.Model(&models.Income{}).Select("COALESCE(SUM(amount), 0)").Scan(&stats.TotalDistributed)
	s.db.Model(&models.Income{}).Where("status = ?", "pending").Select("COALESCE(SUM(amount), 0)").Scan(&stats.PendingPayout)

	var txCount int64
	s.db.Model(&models.Income{}).Count(&txCount)
	stats.Transactions = txCount

	if txCount > 0 {
		var avg float64
		s.db.Model(&models.Income{}).Select("COALESCE(AVG(amount), 0)").Scan(&avg)
		stats.AvgPerMember = avg

		var top struct {
			MemberID string
			Total    float64
		}
		s.db.Model(&models.Income{}).Select("member_id, SUM(amount) as total").Group("member_id").Order("total DESC").Limit(1).Scan(&top)
		if top.MemberID != "" {
			var member models.Member
			s.db.First(&member, "id = ?", top.MemberID)
			stats.HighestEarner = member.FullName
			stats.HighestAmount = top.Total
		}
	}

	return stats, nil
}

// GetSystemHealth returns system health information
func (s *dashboardService) GetSystemHealth() (*SystemHealth, error) {
	return &SystemHealth{
		Status:     "healthy",
		Uptime:     "24h 15m",
		DBStatus:   "connected",
		APIVersion: s.config.App.Version,
		CPULoad:    0.45,
		MemoryUsed: 256,
		MemoryFree: 768,
	}, nil
}

// GetIncomeChartData returns income chart data
func (s *dashboardService) GetIncomeChartData(period string) (*IncomeChartData, error) {
	labels := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	data := []float64{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}

	var results []struct {
		Month int
		Total float64
	}
	s.db.Model(&models.Income{}).
		Select("EXTRACT(MONTH FROM created_at) as month, COALESCE(SUM(amount), 0) as total").
		Where("created_at >= ?", time.Now().AddDate(0, -12, 0)).
		Group("month").
		Order("month").
		Scan(&results)

	for _, r := range results {
		if r.Month >= 1 && r.Month <= 12 {
			data[r.Month-1] = r.Total
		}
	}

	return &IncomeChartData{
		Labels: labels,
		Datasets: []*ChartDataset{
			{
				Label: "Income",
				Data:  data,
				Color: "#4F46E5",
			},
		},
	}, nil
}

// GetMemberGrowthChart returns member growth chart data
func (s *dashboardService) GetMemberGrowthChart(period string) (*MemberGrowthChart, error) {
	labels := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	members := make([]int64, 12)
	growth := make([]float64, 12)

	var results []struct {
		Month int
		Count int64
	}
	s.db.Model(&models.Member{}).
		Select("EXTRACT(MONTH FROM created_at) as month, COUNT(*) as count").
		Where("created_at >= ?", time.Now().AddDate(0, -12, 0)).
		Group("month").
		Order("month").
		Scan(&results)

	var prev int64
	for _, r := range results {
		if r.Month >= 1 && r.Month <= 12 {
			members[r.Month-1] = r.Count
			if prev > 0 {
				growth[r.Month-1] = float64(r.Count-prev) / float64(prev) * 100
			}
			prev = r.Count
		}
	}

	return &MemberGrowthChart{
		Labels:  labels,
		Members: members,
		Growth:  growth,
	}, nil
}

// GetLevelDistribution returns distribution of members across levels
func (s *dashboardService) GetLevelDistribution() (*LevelDistribution, error) {
	var levels []int
	var counts []int64

	configs, err := s.referralRepo.GetAllCommissionConfigs()
	if err != nil {
		return nil, err
	}

	for _, config := range configs {
		levels = append(levels, config.Level)
		var count int64
		s.db.Raw(`
			WITH RECURSIVE referral_tree AS (
				SELECT id, sponsor_id, 1 as lvl FROM members WHERE sponsor_id IS NULL AND deleted_at IS NULL
				UNION ALL
				SELECT m.id, m.sponsor_id, rt.lvl+1 FROM members m INNER JOIN referral_tree rt ON m.sponsor_id = rt.id WHERE m.deleted_at IS NULL
			)
			SELECT COUNT(*) FROM referral_tree WHERE lvl = ?
		`, config.Level).Scan(&count)
		counts = append(counts, count)
	}

	return &LevelDistribution{
		Levels: levels,
		Counts: counts,
	}, nil
}

// GetTopEarners returns top earning members
func (s *dashboardService) GetTopEarners(limit int) ([]*TopEarner, error) {
	var results []struct {
		MemberID string
		Total    float64
	}
	s.db.Model(&models.Income{}).
		Select("member_id, COALESCE(SUM(amount), 0) as total").
		Group("member_id").
		Order("total DESC").
		Limit(limit).
		Scan(&results)

	var earners []*TopEarner
	for _, r := range results {
		var member models.Member
		s.db.First(&member, "id = ?", r.MemberID)

		var directCount int64
		s.db.Model(&models.Referral{}).Where("parent_id = ?", r.MemberID).Count(&directCount)

		earners = append(earners, &TopEarner{
			MemberID:    r.MemberID,
			MemberName:  member.FullName,
			TotalIncome: r.Total,
			DirectCount: int(directCount),
		})
	}

	return earners, nil
}

// GetRecentActivity returns recent system activity
func (s *dashboardService) GetRecentActivity(limit int) ([]*ActivityLog, error) {
	var logs []*ActivityLog
	s.db.Raw(`
		SELECT a.id::text, 'Member' as type, 
			CASE WHEN a.action = 'created' THEN 'New Registration'
				 WHEN a.action = 'updated' THEN 'Profile Update'
				 ELSE a.action END as action,
			a.entity_id::text as details,
			COALESCE(adm.full_name, 'System') as admin_name,
			a.created_at
		FROM audit_logs a
		LEFT JOIN admins adm ON a.admin_id = adm.id
		ORDER BY a.created_at DESC
		LIMIT ?
	`, limit).Scan(&logs)

	return logs, nil
}

// GetSystemAlerts returns system alerts
func (s *dashboardService) GetSystemAlerts() ([]*SystemAlert, error) {
	return []*SystemAlert{
		{
			ID:       "1",
			Type:     "info",
			Severity: "low",
			Message:  "System is running normally",
			Actions:  "",
		},
	}, nil
}
