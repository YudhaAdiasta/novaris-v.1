import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, RiskBadge } from "@/lib/badges";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

export default function FeedBreaches() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.get("/feeds/breaches").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try { await api.put(`/feeds/breaches/${editing.id}`, editing); toast.success("Saved"); setOpen(false); load(); }
    catch { toast.error("Failed"); }
  };

  const sevPill = (s) => s === "Breach"
    ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Breach</span>
    : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Warning</span>;

  const columns = [
    { key: "metric", header: "Metric", render: (b) => <span className="font-medium">{b.metric}</span> },
    { key: "risk_type", header: "Risk Type" },
    { key: "period", header: "Period", render: (b) => <span className="font-mono text-xs">{b.period}</span> },
    { key: "actual_value", header: "Actual", align: "right", render: (b) => <span className="font-mono">{b.actual_value}</span> },
    { key: "warning_threshold", header: "Warning", align: "right", render: (b) => <span className="font-mono text-amber-700">{b.warning_threshold}</span> },
    { key: "breach_threshold", header: "Breach", align: "right", render: (b) => <span className="font-mono text-rose-700">{b.breach_threshold}</span> },
    { key: "severity", header: "Severity", render: (b) => sevPill(b.severity) },
    { key: "escalation_level", header: "Esc. Lvl", align: "center", render: (b) => <span className="font-mono">{b.escalation_level || 1}</span> },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
    { key: "due_date", header: "Due", render: (b) => <span className="text-xs">{b.due_date || "—"}</span> },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Feed Breaches &amp; Warnings</h1>
        <p className="text-sm text-slate-500 mt-1">{list.length} alert(s) — auto-generated when feed data crosses appetite warning or breach thresholds.</p></div>
      <DataTable columns={columns} rows={list} searchKeys={["metric","risk_type","severity","status"]} rowKey={(b)=>b.id} emptyText="No breaches yet."
        actions={(b) => (<RowActions><IconAction icon={Pencil} label="Update" tone="primary" onClick={() => { setEditing(b); setOpen(true); }} /></RowActions>)}
      />
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Update Breach Action</DialogTitle></DialogHeader>
        {editing && <div className="space-y-3">
          <div className="text-xs text-slate-500"><span className="font-semibold">{editing.metric}</span> · {editing.risk_type} · actual <span className="font-mono">{editing.actual_value}</span></div>
          <div><Label>Status</Label><Select value={editing.status} onValueChange={(v) => setEditing({...editing, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Open","In Progress","Closed","Accepted"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Action Plan</Label><Textarea rows={3} value={editing.action_plan || ""} onChange={(e) => setEditing({...editing, action_plan: e.target.value})} /></div>
          <div><Label>Due Date</Label><Input type="date" value={editing.due_date || ""} onChange={(e) => setEditing({...editing, due_date: e.target.value})} /></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
