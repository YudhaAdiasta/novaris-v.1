import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/lib/badges";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";
import { Pencil, Send, CheckCircle2, Flag, ShieldCheck } from "lucide-react";

const OPTIONS = ["Avoid","Reduce / Mitigate","Transfer","Accept","Escalate"];
const PRIORITY = ["Low","Medium","High","Critical"];
const LEVELS = ["Low","Medium","High","Critical"];

export default function TreatmentPlans() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [risks, setRisks] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/treatments").then((r) => setList(r.data));
  useEffect(() => { load(); api.get("/risks").then((r) => setRisks(r.data)); }, []);
  const riskMap = Object.fromEntries(risks.map((r) => [r.id, r]));

  const save = async () => {
    try { await api.put(`/treatments/${editing.id}`, editing); toast.success("Saved"); setEditing(null); load(); }
    catch { toast.error("Failed"); }
  };
  const action = async (id, path) => {
    try { await api.post(`/treatments/${id}/${path}`, { notes: "" }); toast.success("Done"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const columns = [
    { key: "risk", header: "Risk", render: (t) => <Link to={`/risks/${t.risk_id}`} className="text-teal-700 hover:underline font-mono text-xs font-semibold">{riskMap[t.risk_id]?.risk_id || "—"}</Link> },
    { key: "action_description", header: "Action", render: (t) => <span className="max-w-xs truncate inline-block">{t.action_description || <span className="text-slate-400 italic">no description</span>}</span> },
    { key: "action_owner", header: "Owner" },
    { key: "priority", header: "Priority" },
    { key: "target_completion_date", header: "Due", render: (t) => <span className="text-xs">{t.target_completion_date || "—"} {t.is_overdue && <span className="text-rose-600 font-semibold ml-1">OVERDUE</span>}</span> },
    { key: "progress_percentage", header: "Progress", render: (t) => <div className="flex items-center gap-2"><div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-teal-600" style={{ width: `${t.progress_percentage || 0}%` }} /></div><span className="text-xs">{t.progress_percentage || 0}%</span></div> },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Treatment Plans</h1><p className="text-sm text-slate-500 mt-1">{list.length} plans</p></div>

      <DataTable columns={columns} rows={list} searchKeys={["action_description","action_owner","status","priority"]} rowKey={(t)=>t.id} emptyText="No treatment plans yet."
        actions={(t) => (
          <RowActions>
            <IconAction icon={Pencil} label="Edit" tone="primary" onClick={() => setEditing(t)} />
            {t.status === "Draft" && <IconAction icon={Send} label="Submit" onClick={() => action(t.id, "submit")} />}
            {t.status === "Submitted" && ["admin","risk_officer","approver"].includes(user.role) && <IconAction icon={CheckCircle2} label="Approve" tone="primary" onClick={() => action(t.id, "approve")} />}
            {t.status === "In Progress" && <IconAction icon={Flag} label="Complete" onClick={() => action(t.id, "complete")} />}
            {t.status === "Pending Validation" && ["admin","risk_officer"].includes(user.role) && <IconAction icon={ShieldCheck} label="Validate" tone="primary" onClick={() => action(t.id, "validate")} />}
          </RowActions>
        )}
      />

      {editing && (
        <Card className="p-5">
          <h2 className="font-heading text-lg font-semibold text-slate-800 mb-4">Edit Treatment Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <F label="Treatment Option"><Select value={editing.treatment_option} onValueChange={(v) => setEditing({...editing, treatment_option: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <F label="Action Owner"><Input value={editing.action_owner || ""} onChange={(e) => setEditing({...editing, action_owner: e.target.value})} /></F>
            <F label="Priority"><Select value={editing.priority} onValueChange={(v) => setEditing({...editing, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITY.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <F label="Target Date"><Input type="date" value={editing.target_completion_date || ""} onChange={(e) => setEditing({...editing, target_completion_date: e.target.value})} /></F>
            <F label="Target Residual Level"><Select value={editing.target_residual_risk_level} onValueChange={(v) => setEditing({...editing, target_residual_risk_level: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEVELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
            <F label="Progress %"><Input type="number" min={0} max={100} value={editing.progress_percentage || 0} onChange={(e) => setEditing({...editing, progress_percentage: Number(e.target.value)})} /></F>
            <F label="Action Description" full><Textarea rows={2} value={editing.action_description || ""} onChange={(e) => setEditing({...editing, action_description: e.target.value})} /></F>
            <F label="Evidence Notes" full><Textarea rows={2} value={editing.evidence_notes || ""} onChange={(e) => setEditing({...editing, evidence_notes: e.target.value})} /></F>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
const F = ({ label, children, full }) => (
  <div className={full ? "md:col-span-2" : ""}><Label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{label}</Label><div className="mt-1">{children}</div></div>
);
