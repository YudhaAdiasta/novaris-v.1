import React, { useEffect, useState } from "react";
import { api, ROLE_LABELS } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RiskBadge } from "@/lib/badges";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function EscalationMatrix() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.get("/escalations").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try { await api.post("/escalations", { ...editing, days_to_escalate: Number(editing.days_to_escalate) }); toast.success("Added"); setOpen(false); load(); }
    catch (e) { toast.error("Failed"); }
  };
  const del = async (id) => { await api.delete(`/escalations/${id}`); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Escalation Matrix</h1><p className="text-sm text-slate-500 mt-1">Rules that govern when and to whom risks are escalated.</p></div>
        <Button onClick={() => { setEditing({ risk_level:"High", notify_role:"risk_officer", days_to_escalate:3, description:"" }); setOpen(true); }} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-2" />Add Rule</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2.5 px-3">Risk Level</th><th className="text-left py-2.5 px-3">Notify Role</th><th className="text-left py-2.5 px-3">Days to Escalate</th><th className="text-left py-2.5 px-3">Description</th><th></th></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3"><RiskBadge level={e.risk_level} /></td>
                <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">{ROLE_LABELS[e.notify_role] || e.notify_role}</span></td>
                <td className="py-2.5 px-3 font-mono">{e.days_to_escalate} day(s)</td>
                <td className="py-2.5 px-3 text-slate-600">{e.description}</td>
                <td className="py-2.5 px-3"><Button size="sm" variant="ghost" onClick={() => del(e.id)}><Trash2 className="w-4 h-4 text-rose-600" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add Escalation Rule</DialogTitle></DialogHeader>
        {editing && <div className="space-y-3">
          <div><Label>Risk Level</Label><Select value={editing.risk_level} onValueChange={(v) => setEditing({...editing, risk_level: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Notify Role</Label><Select value={editing.notify_role} onValueChange={(v) => setEditing({...editing, notify_role: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["admin","risk_officer","risk_owner","approver"].map((s) => <SelectItem key={s} value={s}>{ROLE_LABELS[s]}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Days to Escalate</Label><Input type="number" min={1} value={editing.days_to_escalate} onChange={(e) => setEditing({...editing, days_to_escalate: e.target.value})} /></div>
          <div><Label>Description</Label><Textarea value={editing.description} onChange={(e) => setEditing({...editing, description: e.target.value})} /></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-blue-700 hover:bg-blue-800">Save</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
