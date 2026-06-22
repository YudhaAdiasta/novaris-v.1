import React, { useEffect, useMemo, useState } from "react";
import { api, ROLE_LABELS } from "@/lib/api";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskBadge, StatusBadge, AppetiteBadge } from "@/lib/badges";
import { Plus, Download, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function RiskRegister() {
  const { user } = useAuth();
  const [risks, setRisks] = useState([]);
  const [cats, setCats] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [fCategory, setFCategory] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fLevel, setFLevel] = useState("all");

  useEffect(() => {
    api.get("/risks").then((r) => setRisks(r.data));
    api.get("/categories").then((r) => setCats(r.data));
    api.get("/users").then((r) => setUsers(r.data)).catch(() => setUsers([]));
  }, []);

  const catMap = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c.name])), [cats]);
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);

  const filtered = useMemo(() => risks.filter((r) => {
    if (search && !`${r.risk_id} ${r.title} ${r.business_unit}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (fCategory !== "all" && r.category_id !== fCategory) return false;
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (fLevel !== "all" && r.residual_level !== fLevel) return false;
    return true;
  }), [risks, search, fCategory, fStatus, fLevel]);

  const exportCSV = async () => {
    const t = localStorage.getItem("novaris_token");
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/reports/risk-register.csv`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "risk_register.csv"; a.click();
  };

  const canCreate = ["admin","risk_owner","risk_officer"].includes(user?.role);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Register</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} of {risks.length} risks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV} data-testid="export-csv-btn"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          {canCreate && <Button asChild className="bg-teal-600 hover:bg-teal-700" data-testid="create-risk-btn"><Link to="/risks/new"><Plus className="w-4 h-4 mr-2" />New Risk</Link></Button>}
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input data-testid="risk-search" placeholder="Search risk title or ID…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <Select value={fCategory} onValueChange={setFCategory}>
            <SelectTrigger className="h-10" data-testid="filter-category"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Categories</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger className="h-10" data-testid="filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>{["all","Draft","Submitted","Under Review","Approved","Returned for Revision","Treatment Required","Treatment in Progress","Pending Validation","Closed"].map((s) => <SelectItem key={s} value={s}>{s==="all"?"All Statuses":s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fLevel} onValueChange={setFLevel}>
            <SelectTrigger className="h-10" data-testid="filter-level"><SelectValue placeholder="All Levels" /></SelectTrigger>
            <SelectContent>{["all","Low","Medium","High","Critical"].map((s) => <SelectItem key={s} value={s}>{s==="all"?"All Levels":s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="risk-register-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="text-left py-2.5 px-3">Risk ID</th>
                <th className="text-left py-2.5 px-3">Title</th>
                <th className="text-left py-2.5 px-3">Category</th>
                <th className="text-left py-2.5 px-3">Unit</th>
                <th className="text-left py-2.5 px-3">Owner</th>
                <th className="text-left py-2.5 px-3">Inherent</th>
                <th className="text-left py-2.5 px-3">Residual</th>
                <th className="text-left py-2.5 px-3">Appetite</th>
                <th className="text-left py-2.5 px-3">Status</th>
                <th className="text-left py-2.5 px-3">Next Review</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition" data-testid={`risk-row-${r.risk_id}`}>
                  <td className="py-2.5 px-3 font-mono text-xs"><Link to={`/risks/${r.id}`} className="text-teal-700 hover:underline font-medium">{r.risk_id}</Link></td>
                  <td className="py-2.5 px-3 max-w-xs truncate text-slate-800">{r.title}</td>
                  <td className="py-2.5 px-3 text-slate-600">{catMap[r.category_id] || "—"}</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.business_unit}</td>
                  <td className="py-2.5 px-3 text-slate-600">{userMap[r.owner_id] || "—"}</td>
                  <td className="py-2.5 px-3"><RiskBadge level={r.inherent_level} /></td>
                  <td className="py-2.5 px-3"><RiskBadge level={r.residual_level} /></td>
                  <td className="py-2.5 px-3"><AppetiteBadge status={r.appetite_status} /></td>
                  <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                  <td className="py-2.5 px-3 text-slate-500 text-xs">{r.next_review_date || "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="10" className="py-10 text-center text-slate-400">No risks match your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
