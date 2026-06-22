import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RiskBadge, StatusBadge } from "@/lib/badges";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const SEV = ["Low","Medium","High","Critical"];
const ST = ["Reported","Investigating","Resolved","Closed"];

export default function Incidents() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.get("/incidents").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const payload = { ...editing, financial_loss: Number(editing.financial_loss || 0) };
      if (editing.id) await api.put(`/incidents/${editing.id}`, payload); else await api.post("/incidents", payload);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error("Failed"); }
  };

  const totalLoss = list.reduce((s, i) => s + (Number(i.financial_loss) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Incidents &amp; Loss Events</h1><p className="text-sm text-slate-500 mt-1">{list.length} incidents · Total loss IDR {totalLoss.toLocaleString()}</p></div>
        <Button onClick={() => { setEditing({ title:"", description:"", business_unit:"", occurrence_date: new Date().toISOString().slice(0,10), severity:"Medium", status:"Reported", financial_loss: 0, root_cause:"", corrective_actions:"" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700" data-testid="add-incident-btn"><Plus className="w-4 h-4 mr-2" />Report Incident</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm" data-testid="incident-table">
          <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2.5 px-3">Code</th><th className="text-left py-2.5 px-3">Title</th><th className="text-left py-2.5 px-3">Unit</th><th className="text-left py-2.5 px-3">Date</th><th className="text-left py-2.5 px-3">Severity</th><th className="text-left py-2.5 px-3">Status</th><th className="text-right py-2.5 px-3">Loss</th><th></th></tr></thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-mono text-xs text-teal-700">{i.incident_code}</td>
                <td className="py-2.5 px-3 font-medium max-w-md truncate">{i.title}</td>
                <td className="py-2.5 px-3">{i.business_unit}</td>
                <td className="py-2.5 px-3 text-xs">{i.occurrence_date}</td>
                <td className="py-2.5 px-3"><RiskBadge level={i.severity} /></td>
                <td className="py-2.5 px-3"><StatusBadge status={i.status} /></td>
                <td className="py-2.5 px-3 text-right font-mono">{Number(i.financial_loss || 0).toLocaleString()}</td>
                <td className="py-2.5 px-3"><Button size="sm" variant="outline" onClick={() => { setEditing(i); setOpen(true); }}>Edit</Button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="8" className="py-10 text-center text-slate-400">No incidents reported.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editing?.id ? "Edit Incident" : "Report Incident"}</DialogTitle></DialogHeader>
        {editing && <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({...editing, title: e.target.value})} /></div>
          <div className="col-span-2"><Label>Description</Label><Textarea rows={2} value={editing.description} onChange={(e) => setEditing({...editing, description: e.target.value})} /></div>
          <div><Label>Business Unit</Label><Input value={editing.business_unit} onChange={(e) => setEditing({...editing, business_unit: e.target.value})} /></div>
          <div><Label>Occurrence Date</Label><Input type="date" value={editing.occurrence_date} onChange={(e) => setEditing({...editing, occurrence_date: e.target.value})} /></div>
          <div><Label>Severity</Label><Select value={editing.severity} onValueChange={(v) => setEditing({...editing, severity: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEV.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Status</Label><Select value={editing.status} onValueChange={(v) => setEditing({...editing, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2"><Label>Financial Loss (IDR)</Label><Input type="number" value={editing.financial_loss} onChange={(e) => setEditing({...editing, financial_loss: e.target.value})} /></div>
          <div className="col-span-2"><Label>Root Cause</Label><Textarea rows={2} value={editing.root_cause} onChange={(e) => setEditing({...editing, root_cause: e.target.value})} /></div>
          <div className="col-span-2"><Label>Corrective Actions</Label><Textarea rows={2} value={editing.corrective_actions} onChange={(e) => setEditing({...editing, corrective_actions: e.target.value})} /></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700">Save</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
