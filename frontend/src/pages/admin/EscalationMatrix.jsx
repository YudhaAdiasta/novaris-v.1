import React, { useEffect, useState } from "react";
import { api, ROLE_LABELS } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RiskBadge } from "@/lib/badges";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";

export default function EscalationMatrix() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.get("/escalations").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => { try { await api.post("/escalations", { ...editing, days_to_escalate: Number(editing.days_to_escalate) }); toast.success("Added"); setOpen(false); load(); } catch { toast.error("Failed"); } };
  const del = async (id) => { await api.delete(`/escalations/${id}`); load(); };

  const columns = [
    { key: "risk_level", header: "Risk Level", render: (e) => <RiskBadge level={e.risk_level} /> },
    { key: "notify_role", header: "Notify Role", render: (e) => <span className="px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 border border-teal-200">{ROLE_LABELS[e.notify_role] || e.notify_role}</span> },
    { key: "days_to_escalate", header: "Days", render: (e) => <span className="font-mono">{e.days_to_escalate} day(s)</span> },
    { key: "description", header: "Description", render: (e) => <span className="text-slate-600">{e.description}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Escalation Matrix</h1><p className="text-sm text-slate-500 mt-1">Rules that govern when and to whom risks are escalated.</p></div>
        <Button onClick={() => { setEditing({ risk_level:"High", notify_role:"risk_officer", days_to_escalate:3, description:"" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4 mr-1" />Add Rule</Button>
      </div>
      <DataTable columns={columns} rows={list} searchKeys={["risk_level","notify_role","description"]} rowKey={(e)=>e.id} emptyText="No escalation rules."
        actions={(e) => (<RowActions><IconAction icon={Trash2} label="Delete" tone="danger" onClick={() => del(e.id)} /></RowActions>)}
      />
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add Escalation Rule</DialogTitle></DialogHeader>{editing && <div className="space-y-3">
        <div><Label>Risk Level</Label><Select value={editing.risk_level} onValueChange={(v) => setEditing({...editing, risk_level: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Notify Role</Label><Select value={editing.notify_role} onValueChange={(v) => setEditing({...editing, notify_role: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["admin","risk_officer","risk_owner","approver"].map((s) => <SelectItem key={s} value={s}>{ROLE_LABELS[s]}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Days to Escalate</Label><Input type="number" min={1} value={editing.days_to_escalate} onChange={(e) => setEditing({...editing, days_to_escalate: e.target.value})} /></div>
        <div><Label>Description</Label><Textarea value={editing.description} onChange={(e) => setEditing({...editing, description: e.target.value})} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
