import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskBadge, StatusBadge, AppetiteBadge } from "@/lib/badges";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";
import { Plus, Download, Eye, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function RiskRegister() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [risks, setRisks] = useState([]);
  const [cats, setCats] = useState([]);
  const [users, setUsers] = useState([]);
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
    if (fCategory !== "all" && r.category_id !== fCategory) return false;
    if (fStatus !== "all" && r.status !== fStatus) return false;
    if (fLevel !== "all" && r.residual_level !== fLevel) return false;
    return true;
  }), [risks, fCategory, fStatus, fLevel]);

  const exportCSV = async () => {
    const t = localStorage.getItem("novaris_token");
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reports/risk-register.csv`, { headers: { Authorization: `Bearer ${t}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "risk_register.csv"; a.click();
  };

  const canCreate = ["admin","risk_owner","risk_officer"].includes(user?.role);
  const canEdit = (r) => ["admin","risk_officer"].includes(user?.role) || (user?.role === "risk_owner" && r.owner_id === user.id && ["Draft","Returned for Revision"].includes(r.status));

  const columns = [
    { key: "risk_id", header: "Risk ID", render: (r) => <Link to={`/risks/${r.id}`} className="font-mono text-xs text-teal-700 hover:underline font-medium">{r.risk_id}</Link> },
    { key: "title", header: "Title", render: (r) => <span className="text-slate-800 max-w-xs truncate inline-block">{r.title}</span> },
    { key: "category", header: "Category", render: (r) => <span className="text-slate-600">{catMap[r.category_id] || "—"}</span> },
    { key: "unit", header: "Unit", render: (r) => <span className="text-slate-600">{r.business_unit}</span> },
    { key: "owner", header: "Owner", render: (r) => <span className="text-slate-600">{userMap[r.owner_id] || "—"}</span> },
    { key: "inherent", header: "Inherent", render: (r) => <RiskBadge level={r.inherent_level} /> },
    { key: "residual", header: "Residual", render: (r) => <RiskBadge level={r.residual_level} /> },
    { key: "appetite", header: "Appetite", render: (r) => <AppetiteBadge status={r.appetite_status} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "next_review_date", header: "Next Review", render: (r) => <span className="text-slate-500 text-xs">{r.next_review_date || "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Register</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage all enterprise risks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCSV} data-testid="export-csv-btn"><Download className="w-4 h-4 mr-1" />Export CSV</Button>
          {canCreate && <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white" data-testid="create-risk-btn"><Link to="/risks/new"><Plus className="w-4 h-4 mr-1" />New Risk</Link></Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select value={fCategory} onValueChange={setFCategory}>
          <SelectTrigger className="h-10 rounded-full bg-white" data-testid="filter-category"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="h-10 rounded-full bg-white" data-testid="filter-status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>{["all","Draft","Submitted","Under Review","Approved","Returned for Revision","Treatment Required","Treatment in Progress","Pending Validation","Closed"].map((s) => <SelectItem key={s} value={s}>{s==="all"?"All Statuses":s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fLevel} onValueChange={setFLevel}>
          <SelectTrigger className="h-10 rounded-full bg-white" data-testid="filter-level"><SelectValue placeholder="All Levels" /></SelectTrigger>
          <SelectContent>{["all","Low","Medium","High","Critical"].map((s) => <SelectItem key={s} value={s}>{s==="all"?"All Levels":s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        searchKeys={["risk_id", "title", "business_unit"]}
        rowKey={(r) => r.id}
        emptyText="No risks match your filters."
        actions={(r) => (
          <RowActions>
            <IconAction icon={Eye} label="View" tone="primary" onClick={() => nav(`/risks/${r.id}`)} />
            {canEdit(r) && <IconAction icon={Pencil} label="Edit" onClick={() => nav(`/risks/${r.id}/edit`)} />}
          </RowActions>
        )}
      />
    </div>
  );
}
