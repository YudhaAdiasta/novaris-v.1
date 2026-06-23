import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/lib/badges";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";
import { Upload, Eye, Download } from "lucide-react";
import { toast } from "sonner";

export default function FeedBatches() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [fGroup, setFGroup] = useState("all");
  const [fStatus, setFStatus] = useState("all");

  useEffect(() => {
    api.get("/feeds/groups").then((r) => setGroups(r.data));
    api.get("/feeds/batches").then((r) => setList(r.data));
  }, []);

  const filtered = list.filter((b) => (fGroup === "all" || b.group === fGroup) && (fStatus === "all" || b.status === fStatus));

  const downloadTemplate = async (g) => {
    const t = localStorage.getItem("novaris_token");
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/feeds/template/${g}.csv`, { headers: { Authorization: `Bearer ${t}` } });
    const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${g}_template.csv`; a.click();
    toast.success("Template downloaded");
  };

  const columns = [
    { key: "batch_code", header: "Code", render: (b) => <Link to={`/feeds/batches/${b.id}`} className="font-mono text-xs text-teal-700 font-semibold hover:underline">{b.batch_code}</Link> },
    { key: "group_label", header: "Feed Group", render: (b) => <span className="font-medium">{b.group_label}</span> },
    { key: "period", header: "Period", render: (b) => <span className="font-mono text-xs">{b.period}</span> },
    { key: "uploaded_by_name", header: "Uploaded By" },
    { key: "uploaded_at", header: "When", render: (b) => <span className="text-xs text-slate-500">{new Date(b.uploaded_at).toLocaleString()}</span> },
    { key: "total_records", header: "Records", align: "right", render: (b) => <span className="font-mono">{b.successful_records}/{b.total_records}</span> },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Data Feed Management</h1>
          <p className="text-sm text-slate-500 mt-1">Upload periodic data, validate, approve, and process into the risk engine.</p>
        </div>
        <Button onClick={() => nav("/feeds/upload")} className="bg-teal-600 hover:bg-teal-700 text-white"><Upload className="w-4 h-4 mr-1" />New Upload</Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-3">Templates</div>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <Button key={g.key} size="sm" variant="outline" onClick={() => downloadTemplate(g.key)} className="text-xs">
              <Download className="w-3 h-3 mr-1" />{g.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select value={fGroup} onValueChange={setFGroup}>
          <SelectTrigger className="h-10 rounded-full bg-white"><SelectValue placeholder="All Groups" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Groups</SelectItem>{groups.map((g) => <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="h-10 rounded-full bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>{["all","Ready for Review","Approved","Processed","Validation Failed","Rejected"].map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All Statuses" : s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} rows={filtered} searchKeys={["batch_code","group_label","period","uploaded_by_name"]} rowKey={(b)=>b.id} emptyText="No batches yet."
        actions={(b) => (<RowActions><IconAction icon={Eye} label="Open" tone="primary" onClick={() => nav(`/feeds/batches/${b.id}`)} /></RowActions>)}
      />
    </div>
  );
}
