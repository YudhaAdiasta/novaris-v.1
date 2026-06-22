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
    try {
      await api.put(`/treatments/${editing.id}`, editing);
      toast.success("Saved"); setEditing(null); load();
    } catch (e) { toast.error("Failed"); }
  };

  const action = async (id, path) => {
    try { await api.post(`/treatments/${id}/${path}`, { notes: "" }); toast.success("Done"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Treatment Plans</h1>
        <p className="text-sm text-slate-500 mt-1">{list.length} plans</p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm" data-testid="treatments-table">
          <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-xs uppercase tracking-wider text-slate-500">
            <th className="text-left py-2.5 px-3">Risk</th><th className="text-left py-2.5 px-3">Action</th><th className="text-left py-2.5 px-3">Owner</th><th className="text-left py-2.5 px-3">Priority</th><th className="text-left py-2.5 px-3">Due</th><th className="text-left py-2.5 px-3">Progress</th><th className="text-left py-2.5 px-3">Status</th><th className="text-left py-2.5 px-3">Actions</th>
          </tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} className={`border-b border-slate-100 hover:bg-slate-50 ${t.is_overdue ? "bg-rose-50/40" : ""}`}>
                <td className="py-2.5 px-3"><Link to={`/risks/${t.risk_id}`} className="text-teal-700 hover:underline font-mono text-xs">{riskMap[t.risk_id]?.risk_id || "—"}</Link></td>
                <td className="py-2.5 px-3 max-w-xs truncate">{t.action_description || <span className="text-slate-400 italic">no description</span>}</td>
                <td className="py-2.5 px-3">{t.action_owner || "—"}</td>
                <td className="py-2.5 px-3">{t.priority}</td>
                <td className="py-2.5 px-3 text-xs">{t.target_completion_date || "—"} {t.is_overdue && <span className="text-rose-600 font-semibold ml-1">OVERDUE</span>}</td>
                <td className="py-2.5 px-3"><div className="flex items-center gap-2"><div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-teal-600" style={{ width: `${t.progress_percentage || 0}%` }} /></div><span className="text-xs">{t.progress_percentage || 0}%</span></div></td>
                <td className="py-2.5 px-3"><StatusBadge status={t.status} /></td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(t)}>Edit</Button>
                    {t.status === "Draft" && <Button size="sm" onClick={() => action(t.id, "submit")} className="bg-teal-600 hover:bg-teal-700">Submit</Button>}
                    {t.status === "Submitted" && ["admin","risk_officer","approver"].includes(user.role) && <Button size="sm" onClick={() => action(t.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>}
                    {t.status === "In Progress" && <Button size="sm" onClick={() => action(t.id, "complete")} className="bg-purple-600 hover:bg-purple-700">Complete</Button>}
                    {t.status === "Pending Validation" && ["admin","risk_officer"].includes(user.role) && <Button size="sm" onClick={() => action(t.id, "validate")} className="bg-emerald-600 hover:bg-emerald-700">Validate</Button>}
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="8" className="py-10 text-center text-slate-400">No treatment plans yet.</td></tr>}
          </tbody>
        </table>
      </Card>

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
            <Button onClick={save} className="bg-teal-600 hover:bg-teal-700">Save</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const F = ({ label, children, full }) => (
  <div className={full ? "md:col-span-2" : ""}><Label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{label}</Label><div className="mt-1">{children}</div></div>
);
