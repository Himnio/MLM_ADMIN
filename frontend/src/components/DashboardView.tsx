"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type {
  DashboardOverview,
  IncomeChartData,
  MemberGrowthChart,
  TopEarner,
  ActivityLog,
  SystemAlert,
  LevelDistribution,
} from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = [
  "#4F46E5",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

export default function DashboardView() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [incomeChart, setIncomeChart] = useState<IncomeChartData | null>(null);
  const [growthChart, setGrowthChart] = useState<MemberGrowthChart | null>(
    null,
  );
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [levelDist, setLevelDist] = useState<LevelDistribution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardOverview>("/dashboard/overview"),
      api.get<IncomeChartData>("/dashboard/charts/income?period=monthly"),
      api.get<MemberGrowthChart>("/dashboard/charts/growth?period=monthly"),
      api.get<TopEarner[]>("/dashboard/top-earners?limit=5"),
      api.get<ActivityLog[]>("/dashboard/activity?limit=10"),
      api.get<SystemAlert[]>("/dashboard/alerts"),
      api.get<LevelDistribution>("/dashboard/levels"),
    ]).then(([ov, ic, gc, te, act, al, ld]) => {
      if (ov.success && ov.data) setOverview(ov.data);
      if (ic.success && ic.data) setIncomeChart(ic.data);
      if (gc.success && gc.data) setGrowthChart(gc.data);
      if (te.success && te.data) setTopEarners(te.data);
      if (act.success && act.data) setActivities(act.data);
      if (al.success && al.data) setAlerts(al.data);
      if (ld.success && ld.data) setLevelDist(ld.data);
      setLoading(false);
    });
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
                a.severity === "critical"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : a.severity === "warning"
                    ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              <span className="font-semibold">{a.type}:</span> {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Members"
            value={overview.total_members.toLocaleString()}
            subtitle={`${overview.active_members} active`}
            color="indigo"
          />
          <StatCard
            title="Total Income"
            value={formatCurrency(overview.total_income)}
            subtitle={`${formatCurrency(overview.pending_income)} pending`}
            color="green"
          />
          <StatCard
            title="Total Referrals"
            value={overview.total_referrals.toLocaleString()}
            subtitle={`${overview.commission_rate}% commission`}
            color="purple"
          />
          <StatCard
            title="Growth Rate"
            value={`${overview.growth_rate}%`}
            subtitle={`${overview.new_members_today} new today`}
            color="amber"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Income Overview</h3>
          {incomeChart && incomeChart.labels.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={incomeChart.labels.map((l, i) => ({
                  name: l,
                  ...Object.fromEntries(
                    incomeChart.datasets.map((d) => [d.label, d.data[i] || 0]),
                  ),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {incomeChart.datasets.map((d, i) => (
                  <Bar
                    key={d.label}
                    dataKey={d.label}
                    fill={d.color || COLORS[i % COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">
              No income chart data available
            </p>
          )}
        </div>

        {/* Member Growth Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Member Growth</h3>
          {growthChart && growthChart.labels.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={growthChart.labels.map((l, i) => ({
                  name: l,
                  members: growthChart.members[i],
                  growth: growthChart.growth[i],
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="members"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Members"
                />
                <Line
                  type="monotone"
                  dataKey="growth"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Growth %"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">
              No growth chart data available
            </p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Level Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Level Distribution</h3>
          {levelDist && levelDist.levels.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={levelDist.levels.map((l, i) => ({
                    name: `Level ${l}`,
                    value: levelDist.counts[i],
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {levelDist.levels.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">No level data</p>
          )}
        </div>

        {/* Top Earners */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Top Earners</h3>
          {topEarners.length > 0 ? (
            <div className="space-y-3">
              {topEarners.map((e, i) => (
                <div
                  key={e.member_id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        i === 0
                          ? "bg-yellow-400"
                          : i === 1
                            ? "bg-gray-400"
                            : i === 2
                              ? "bg-amber-600"
                              : "bg-gray-300"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{e.member_name}</p>
                      <p className="text-xs text-gray-400">
                        {e.direct_count} direct
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(e.total_income)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">No earners data</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {activities.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      a.type === "income"
                        ? "bg-green-400"
                        : a.type === "member"
                          ? "bg-blue-400"
                          : a.type === "referral"
                            ? "bg-purple-400"
                            : "bg-gray-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {a.details || a.action}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.admin_name} ·{" "}
                      {new Date(a.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">
              No recent activity
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    green: "bg-green-50 border-green-200 text-green-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color] || colors.indigo}`}>
      <p className="text-sm font-medium opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs mt-1 opacity-70">{subtitle}</p>
    </div>
  );
}
