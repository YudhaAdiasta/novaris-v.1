import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, RISK_LEVEL_SOLID, formatCompact, formatNumber } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Kpi } from "@/components/Kpi";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle2, FileWarning, TrendingUp, Database, Briefcase, BarChart3, ScanLine, Coins } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, LineChart, Line, Legend } from "recharts";

const PIE = ["#0D9488","#0EA5E9","#10B981","#F59E0B","#F97316","#8B5CF6","#E11D48","#64748B"];
const SEV_COLOR = { Warning: "#F59E0B", Breach: "#E11D48" };

const TABS = [
  { key: "data", label: "Data Feed", icon: Database },
  { key: "appetite", label: "Appetite Monitoring", icon: AlertTriangle },
  { key: "investment", label: "Investment Risk", icon: Briefcase },
  { key: "fixed-income", label: "Fixed Income", icon: BarChart3 },
  { key: "roi", label: "ROI / Funding", icon: Coins },
  { key: "scoring", label: "Instrument Scoring", icon: ScanLine },
];

export default function FeedDashboards() {
  const { group } = useParams();
  const nav = useNavigate();
  const tab = group || "data";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Feed Dashboards</h1>
        <p className="text-sm text-slate-500 mt-1">Live analytics from approved data feeds.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.key} size="sm" variant={tab===t.key?"default":"outline"} onClick={()=>nav(`/feeds/dashboards/${t.key}`)} className={tab===t.key?"bg-teal-600 hover:bg-teal-700 text-white":""}>
            <t.icon className="w-3 h-3 mr-1" />{t.label}
          </Button>
        ))}
      </div>

      {tab === "data" && <DataFeedDash />}
      {tab === "appetite" && <AppetiteDash />}
      {tab === "investment" && <InvestmentDash />}
      {tab === "fixed-income" && <FixedIncomeDash />}
      {tab === "roi" && <RoiDash />}
      {tab === "scoring" && <ScoringDash />}
    </div>
  );
}

function DataFeedDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/feeds/dashboard").then((r) => setD(r.data)); }, []);
  if (!d) return <Skeleton />;
  const rows = Object.entries(d.by_group).map(([k, v]) => ({ group: k, ...v }));
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Kpi icon={Database} label="Processed" value={d.processed} tone="bg-teal-50 text-teal-700" />
        <Kpi icon={Activity} label="Pending Approval" value={d.pending_approval} tone="bg-amber-50 text-amber-700" />
        <Kpi icon={FileWarning} label="Failed/Rejected" value={d.failed} tone="bg-rose-50 text-rose-700" />
        <Kpi icon={CheckCircle2} label="Completeness" value={`${d.completeness}%`} tone="bg-emerald-50 text-emerald-700" />
        <Kpi icon={AlertTriangle} label="Open Breaches" value={d.open_breaches} tone="bg-rose-50 text-rose-700" />
        <Kpi icon={TrendingUp} label="Warnings" value={d.breaches_by_severity.Warning || 0} tone="bg-amber-50 text-amber-700" />
      </div>
      <Card className="p-5">
        <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Batches by Feed Group</h3>
        <div className="h-72">
          <ResponsiveContainer><BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#64748B" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
            <Tooltip /><Legend />
            <Bar dataKey="processed" stackId="a" fill="#0D9488" />
            <Bar dataKey="pending" stackId="a" fill="#F59E0B" />
            <Bar dataKey="failed" stackId="a" fill="#E11D48" />
          </BarChart></ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}

function AppetiteDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/feeds/dashboard/appetite").then((r) => setD(r.data)); }, []);
  if (!d) return <Skeleton />;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Activity} label="Appetite Records" value={d.appetites.length} tone="bg-teal-50 text-teal-700" />
        <Kpi icon={AlertTriangle} label="Breaches" value={d.breaches.filter(b => b.severity === "Breach").length} tone="bg-rose-50 text-rose-700" />
        <Kpi icon={AlertTriangle} label="Warnings" value={d.breaches.filter(b => b.severity === "Warning").length} tone="bg-amber-50 text-amber-700" />
        <Kpi icon={CheckCircle2} label="Risk-Type Ratings" value={d.ratings.length} tone="bg-emerald-50 text-emerald-700" />
      </div>
      <Card className="p-5">
        <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Risk-Type Quantitative Ratings</h3>
        <div className="overflow-auto"><table className="w-full text-sm">
          <thead><tr className="text-xs uppercase tracking-wider text-slate-500 border-b"><th className="text-left py-2 px-3">Risk Type</th><th className="text-left py-2 px-3">Score</th><th className="text-left py-2 px-3">Rating</th><th className="text-left py-2 px-3">Period</th></tr></thead>
          <tbody>
            {d.ratings.map((r, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-2 px-3 font-medium">{r.risk_type}</td><td className="py-2 px-3 font-mono">{r.score}</td><td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">{r.rating}</span></td><td className="py-2 px-3 text-xs font-mono">{r.period}</td></tr>))}
            {!d.ratings.length && <tr><td colSpan={4} className="py-8 text-center text-slate-400">No ratings yet — process a quantitative feed.</td></tr>}
          </tbody></table></div>
      </Card>
      <Card className="p-5">
        <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Active Breaches</h3>
        <div className="overflow-auto"><table className="w-full text-sm">
          <thead><tr className="text-xs uppercase tracking-wider text-slate-500 border-b"><th className="text-left py-2 px-3">Metric</th><th className="text-left py-2 px-3">Risk Type</th><th className="text-right py-2 px-3">Actual</th><th className="text-right py-2 px-3">Threshold</th><th className="text-left py-2 px-3">Severity</th></tr></thead>
          <tbody>{d.breaches.map((b, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-2 px-3 font-medium">{b.metric}</td><td className="py-2 px-3">{b.risk_type}</td><td className="py-2 px-3 text-right font-mono">{b.actual_value}</td><td className="py-2 px-3 text-right font-mono">{b.breach_threshold}</td><td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: SEV_COLOR[b.severity] + "20", color: SEV_COLOR[b.severity] }}>{b.severity}</span></td></tr>))}</tbody>
        </table></div>
      </Card>
    </>
  );
}

function InvestmentDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/feeds/dashboard/holdings").then((r) => setD(r.data)); }, []);
  if (!d) return <Skeleton />;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Briefcase} label="Holdings Records" value={d.total_records} tone="bg-teal-50 text-teal-700" />
        <Kpi icon={TrendingUp} label="Unrealised P&L" value={(d.unrealized_total || 0).toLocaleString()} tone="bg-emerald-50 text-emerald-700" />
        <Kpi icon={Activity} label="Asset Classes" value={d.by_asset_class.length} tone="bg-sky-50 text-sky-700" />
        <Kpi icon={Activity} label="Issuers" value={d.by_issuer.length} tone="bg-purple-50 text-purple-700" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Pie3 title="Exposure by Asset Class" data={d.by_asset_class} />
        <Pie3 title="Exposure by Sector" data={d.by_sector} />
        <Pie3 title="Exposure by Rating" data={d.by_rating} />
        <Pie3 title="Exposure by Issuer (Top)" data={d.by_issuer.slice(0, 8)} />
      </div>
      <Card className="p-5">
        <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Top 10 Largest Holdings</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-xs uppercase tracking-wider text-slate-500 border-b"><th className="text-left py-2 px-3">Instrument</th><th className="text-left py-2 px-3">Issuer</th><th className="text-left py-2 px-3">Class</th><th className="text-right py-2 px-3">Market Value</th><th className="text-right py-2 px-3">P&amp;L</th></tr></thead>
          <tbody>{d.top10.map((r, i) => (<tr key={i} className="border-b border-slate-100"><td className="py-2 px-3 font-mono text-xs text-teal-700">{r.instrument_code}</td><td className="py-2 px-3">{r.issuer_name}</td><td className="py-2 px-3">{r.asset_class}</td><td className="py-2 px-3 text-right font-mono">{Number(r.market_value || 0).toLocaleString()}</td><td className={`py-2 px-3 text-right font-mono ${Number(r.unrealized_gain_loss||0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{Number(r.unrealized_gain_loss || 0).toLocaleString()}</td></tr>))}</tbody>
        </table>
      </Card>
    </>
  );
}

function FixedIncomeDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/feeds/dashboard/fixed-income").then((r) => setD(r.data)); }, []);
  if (!d) return <Skeleton />;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Kpi icon={BarChart3} label="FI Records" value={d.total_records} tone="bg-teal-50 text-teal-700" />
        <Kpi icon={Activity} label="Avg Duration" value={d.avg_duration} tone="bg-sky-50 text-sky-700" />
        <Kpi icon={Activity} label="Maturity Buckets" value={d.maturity_ladder.length} tone="bg-purple-50 text-purple-700" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5"><h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Maturity Ladder</h3><div className="h-64"><ResponsiveContainer><BarChart data={d.maturity_ladder}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} /><XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#64748B" }} /><YAxis tick={{ fontSize: 11, fill: "#64748B" }} /><Tooltip /><Bar dataKey="value" fill="#0D9488" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></Card>
        <Pie3 title="Rating Distribution" data={d.rating_distribution.map(r => ({ label: r.rating, value: r.value }))} />
      </div>
    </>
  );
}

function RoiDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/feeds/dashboard/roi").then((r) => setD(r.data)); }, []);
  if (!d) return <Skeleton />;
  const latest = d.latest || {};
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Coins} label="ROI Realised" value={latest.roi_realized ? `${latest.roi_realized}%` : "—"} tone="bg-teal-50 text-teal-700" />
        <Kpi icon={TrendingUp} label="ROI vs Plan" value={latest.roi_deviation != null ? `${latest.roi_deviation}` : "—"} tone={latest.roi_deviation >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"} />
        <Kpi icon={Activity} label="BOPO Ratio" value={latest.bopo_ratio ? `${latest.bopo_ratio}%` : "—"} tone="bg-amber-50 text-amber-700" />
        <Kpi icon={CheckCircle2} label="Funding Ratio" value={latest.funding_ratio ?? "—"} tone="bg-sky-50 text-sky-700" />
      </div>
      {d.series.length > 0 && <Card className="p-5"><h3 className="font-heading text-base font-semibold text-slate-800 mb-4">ROI Trend (Realised vs Business Plan)</h3><div className="h-72"><ResponsiveContainer><LineChart data={d.series}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748B" }} /><YAxis tick={{ fontSize: 11, fill: "#64748B" }} /><Tooltip /><Legend /><Line type="monotone" dataKey="roi_realized" stroke="#0D9488" strokeWidth={2} /><Line type="monotone" dataKey="roi_business_plan" stroke="#64748B" strokeDasharray="5 5" /></LineChart></ResponsiveContainer></div></Card>}
    </>
  );
}

function ScoringDash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/feeds/dashboard/scoring").then((r) => setD(r.data)); }, []);
  if (!d) return <Skeleton />;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={ScanLine} label="Instruments Scored" value={d.instruments.length} tone="bg-teal-50 text-teal-700" />
        <Kpi icon={AlertTriangle} label="Watchlist" value={d.watchlist.length} tone="bg-rose-50 text-rose-700" />
      </div>
      <Pie3 title="By Risk Category" data={d.by_category} />
      <Card className="p-5">
        <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Watchlist (High / Very High)</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-xs uppercase tracking-wider text-slate-500 border-b"><th className="text-left py-2 px-3">Code</th><th className="text-left py-2 px-3">Name</th><th className="text-left py-2 px-3">Type</th><th className="text-right py-2 px-3">Score</th><th className="text-left py-2 px-3">Category</th></tr></thead>
          <tbody>{d.watchlist.map((i, k) => (<tr key={k} className="border-b border-slate-100"><td className="py-2 px-3 font-mono text-xs text-teal-700">{i.instrument_code}</td><td className="py-2 px-3">{i.instrument_name}</td><td className="py-2 px-3">{i.instrument_type}</td><td className="py-2 px-3 text-right font-mono">{i.total_score}</td><td className="py-2 px-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">{i.risk_category}</span></td></tr>))}
          {!d.watchlist.length && <tr><td colSpan={5} className="py-8 text-center text-slate-400">No high-risk instruments — process a scoring feed.</td></tr>}
          </tbody></table>
      </Card>
    </>
  );
}

const Pie3 = ({ title, data, valueFormatter }) => {
  const fmt = valueFormatter || formatCompact;
  return (
    <Card className="p-5">
      <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-slate-400">No data yet.</div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer>
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="42%" outerRadius="70%" innerRadius="0%" paddingAngle={2}
                label={({ value }) => fmt(value)}
                labelLine={{ stroke: "#CBD5E1", strokeWidth: 1 }}>
                {data.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} stroke="#fff" strokeWidth={1.5} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [formatNumber(v), n]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
              <Legend verticalAlign="bottom" height={48} iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "#475569", paddingTop: 8 }}
                formatter={(label) => <span className="text-slate-600">{label}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

const Skeleton = () => <div className="text-slate-400">Loading…</div>;
