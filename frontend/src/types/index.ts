// ============ API Response Types ============

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============ Auth Types ============

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  admin: AdminResponse;
}

export interface AdminResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

// ============ Member Types ============

export interface Member {
  id: string;
  sponsor_id?: string;
  sponsor_name?: string;
  member_code: string;
  full_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface MemberWithDownlineCount extends Member {
  downline_count: number;
}

export interface CreateMemberInput {
  full_name: string;
  email?: string;
  phone?: string;
  sponsor_id?: string;
}

export interface UpdateMemberInput {
  full_name?: string;
  email?: string;
  phone?: string;
  status?: string;
}

export interface MemberFilter {
  status?: string;
  search?: string;
}

// ============ Referral Types ============

export interface CommissionConfig {
  level: number;
  income_amount: number;
  seat_capacity: number;
  commission_percentage: number;
  is_active: boolean;
}

export interface ReferralTreeResponse {
  member: Member;
  levels: LevelDetail[];
  total_downline: number;
  max_depth: number;
}

export interface LevelDetail {
  level: number;
  seat_capacity: number;
  income_per_seat: number;
  members: MemberWithLevel[];
  total_members: number;
  potential_income: number;
  actual_income: number;
}

export interface MemberWithLevel extends Member {
  level: number;
}

export interface TreeSummaryResponse {
  total_members: number;
  active_members: number;
  total_levels: number;
  total_income: number;
  potential_income: number;
  level_breakdown: LevelBreakdown[];
}

export interface LevelBreakdown {
  level: number;
  seat_capacity: number;
  seat_filled: number;
  percentage: number;
  income_amount: number;
  total_income: number;
}

export interface IncomeProjectionResponse {
  member_id: string;
  total_potential: number;
  total_actual: number;
  level_projections: LevelProjection[];
  growth_projections: GrowthProjection[];
}

export interface LevelProjection {
  level: number;
  income_per_seat: number;
  seat_capacity: number;
  seat_filled: number;
  percentage_complete: number;
  potential_income: number;
  actual_income: number;
}

export interface GrowthProjection {
  percentage: number;
  total_income: number;
  description: string;
}

export interface ReferralStatsResponse {
  total_referrals: number;
  direct_referrals: number;
  indirect_referrals: number;
  max_tree_depth: number;
  level_distribution: Record<number, number>;
}

// ============ Income Types ============

export interface Income {
  id: string;
  member_id: string;
  member_name?: string;
  from_member_id?: string;
  from_member_name?: string;
  level: number;
  amount: number;
  percentage: number;
  transaction_id: string;
  status: 'completed' | 'pending' | 'reversed';
  description?: string;
  created_at: string;
  processed_at?: string;
}

export interface IncomeCalculationResult {
  income_id: string;
  amount: number;
  level: number;
  status: string;
  message: string;
  created_at: string;
}

export interface IncomeProjection {
  member_id: string;
  actual_total: number;
  potential_total: number;
  completion_percentage: number;
  by_level: Record<number, number>;
  max_possible_by_level: Record<number, number>;
}

// ============ Dashboard Types ============

export interface DashboardOverview {
  total_members: number;
  active_members: number;
  total_income: number;
  pending_income: number;
  total_referrals: number;
  commission_rate: number;
  growth_rate: number;
  new_members_today: number;
}

export interface MemberDashboardStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  suspended: number;
  by_status: Record<string, number>;
  by_referral_count: Record<string, number>;
}

export interface IncomeDashboardStats {
  total_distributed: number;
  pending_payout: number;
  avg_per_member: number;
  highest_earner: string;
  highest_amount: number;
  transactions: number;
}

export interface SystemHealth {
  status: string;
  uptime: string;
  db_status: string;
  api_version: string;
  cpu_load: number;
  memory_used: number;
  memory_free: number;
}

export interface IncomeChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  color: string;
}

export interface MemberGrowthChart {
  labels: string[];
  members: number[];
  growth: number[];
}

export interface LevelDistribution {
  levels: number[];
  counts: number[];
}

export interface TopEarner {
  member_id: string;
  member_name: string;
  total_income: number;
  direct_count: number;
}

export interface ActivityLog {
  id: string;
  type: string;
  action: string;
  details: string;
  admin_name: string;
  created_at: string;
}

export interface SystemAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  actions: string;
}

// ============ Referral Link System Types ============

export interface ReferralCodeItem {
  id: string;
  referral_code: string;
  created_by_username: string;
  created_at: string;
  is_active: boolean;
  registrations_count: number;
}

export interface ReferralRegistrationItem {
  id: string;
  name: string;
  username: string;
  email: string;
  pan_card_id: string;
  full_name: string;
  registered_at: string;
}

export interface CreateCodeResponse {
  success: boolean;
  referral_code: string;
  referral_link: string;
}

export interface ValidateCodeResponse {
  valid: boolean;
  referral_code?: string;
  created_by?: string;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  registration_id?: string;
  message: string;
}