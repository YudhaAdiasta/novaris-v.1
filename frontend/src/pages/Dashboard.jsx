import React, { useEffect, useState } from "react";
import { api, RISK_LEVEL_SOLID } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { RiskBadge, StatusBadge } from "@/lib/badges";
import { Link } from "react-router-dom";
import { AlertTriangle, TrendingUp, Activity, ShieldAlert, CheckCircle2, Clock, FileWarning } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import { Kpi } from "@/components/Kpi";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [adv, setAdv] = useState(null);
  const [p3, setP3] = useState(null);
  useEffect(() => { api.get("/dashboard").then((r) => setData(r.data)); api.get("/dashboard/advanced").then((r) => setAdv(r.data)).catch(()=>{}); api.get("/dashboard/phase3").then((r)=>setP3(r.data)).catch(()=>{}); }, []);
  if (!data) return <div className="text-slate-500">Loading dashboard…</div>;

  const levelData = ["Low","Medium","High","Critical"].map((k) => ({ name: k, value: data.by_level[k] || 0 }));
  const statusData = Object.entries(data.by_status).map(([name, value]) => ({ name, value }));
  const catData = Object.entries(data.by_category).map(([name, value]) => ({ name, value }));
  const trData = Object.entries(data.treatment_status).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Enterprise risk posture at a glance.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Kpi icon={Activity} label="Total Risks" value={data.total_risks} tone="bg-teal-50 text-teal-700" />
        <Kpi icon={ShieldAlert} label="Critical" value={data.critical_risks} tone="bg-rose-50 text-rose-700" />
        <Kpi icon={AlertTriangle} label="High" value={data.high_risks} tone="bg-orange-50 text-orange-700" />
        <Kpi icon={TrendingUp} label="Exceeds Appetite" value={data.exceeding_appetite} tone="bg-rose-50 text-rose-700" />
        <Kpi icon={CheckCircle2} label="Open Treatments" value={data.open_treatments} tone="bg-purple-50 text-purple-700" />
        <Kpi icon={FileWarning} label="Overdue" value={data.overdue_treatments} tone="bg-rose-50 text-rose-700" />
        <Kpi icon={Clock} label="Pending Approvals" value={data.pending_approvals} tone="bg-amber-50 text-amber-700" />
      </div>

      {adv && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Kpi icon={Activity} label="KRIs Total" value={adv.kri_total} tone="bg-teal-50 text-teal-700" />
          <Kpi icon={AlertTriangle} label="KRIs Red" value={adv.kri_red} tone="bg-rose-50 text-rose-700" />
          <Kpi icon={AlertTriangle} label="KRIs Amber" value={adv.kri_amber} tone="bg-amber-50 text-amber-700" />
          <Kpi icon={ShieldAlert} label="Incidents Open" value={adv.incidents_open} tone="bg-orange-50 text-orange-700" />
          <Kpi icon={TrendingUp} label="Loss YTD (IDR M)" value={Math.round((adv.incidents_loss_total||0)/1_000_000)} tone="bg-rose-50 text-rose-700" />
          <Kpi icon={Clock} label="Reviews ≤ 7d" value={adv.upcoming_reviews_7d} tone="bg-amber-50 text-amber-700" />
          <Kpi icon={FileWarning} label="Overdue Reviews" value={adv.overdue_reviews} tone="bg-rose-50 text-rose-700" />
        </div>
      )}

      {p3 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Kpi icon={Activity} label="Upcoming Meetings" value={p3.upcoming_meetings} tone="bg-teal-50 text-teal-700" />
          <Kpi icon={AlertTriangle} label="Overdue Obligations" value={p3.overdue_obligations} tone="bg-rose-50 text-rose-700" />
          <Kpi icon={Clock} label="Obligations ≤ 30d" value={p3.upcoming_obligations} tone="bg-amber-50 text-amber-700" />
          <Kpi icon={ShieldAlert} label="Failed Tests" value={p3.tests_failed} tone="bg-rose-50 text-rose-700" />
          <Kpi icon={FileWarning} label="Open Deficiencies" value={p3.open_deficiencies} tone="bg-orange-50 text-orange-700" />
          <Kpi icon={CheckCircle2} label="Active Acceptances" value={p3.active_acceptances} tone="bg-purple-50 text-purple-700" />
          <Kpi icon={TrendingUp} label="Expiring ≤ 30d" value={p3.expiring_acceptances} tone="bg-amber-50 text-amber-700" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Risk by Level (Residual)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4,4,0,0]}>
                  {levelData.map((d, i) => <Cell key={i} fill={RISK_LEVEL_SOLID[d.name]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Risk by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="42%" outerRadius="70%" paddingAngle={2}
                  label={({ value }) => value > 0 ? value : ""}
                  labelLine={{ stroke: "#CBD5E1", strokeWidth: 1 }}>
                  {catData.map((_, i) => <Cell key={i} fill={["#0D9488","#10B981","#F59E0B","#F97316","#E11D48","#8B5CF6","#0EA5E9","#64748B"][i % 8]} stroke="#fff" strokeWidth={1.5} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
                <Legend verticalAlign="bottom" height={48} iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: "#475569", paddingTop: 8 }}
                  formatter={(label) => <span className="text-slate-600">{label}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Risk by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={130} />
                <Tooltip />
                <Bar dataKey="value" fill="#0D9488" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Treatment Plan Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Top 10 Highest Residual Risks</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2 px-3">Risk ID</th><th className="text-left py-2 px-3">Title</th><th className="text-left py-2 px-3">Residual</th><th className="text-left py-2 px-3">Score</th><th className="text-left py-2 px-3">Status</th></tr></thead>
            <tbody>
              {data.top_residual.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono text-xs"><Link to={`/risks/${r.id}`} className="text-teal-700 hover:underline">{r.risk_id}</Link></td>
                  <td className="py-2 px-3">{r.title}</td>
                  <td className="py-2 px-3"><RiskBadge level={r.residual_level} /></td>
                  <td className="py-2 px-3 font-mono">{r.residual_score}</td>
                  <td className="py-2 px-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {data.top_residual.length === 0 && <tr><td colSpan="5" className="py-6 text-center text-slate-400">No risks yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
