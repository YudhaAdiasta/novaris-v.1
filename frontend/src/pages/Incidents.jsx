import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RiskBadge, StatusBadge } from "@/lib/badges";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

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
    } catch { toast.error("Failed"); }
  };

  const totalLoss = list.reduce((s, i) => s + (Number(i.financial_loss) || 0), 0);

  const columns = [
    { key: "incident_code", header: "Code", render: (i) => <span className="font-mono text-xs text-teal-700 font-semibold">{i.incident_code}</span> },
    { key: "title", header: "Title", render: (i) => <span className="font-medium text-slate-800 max-w-md truncate inline-block">{i.title}</span> },
    { key: "business_unit", header: "Unit" },
    { key: "occurrence_date", header: "Date", render: (i) => <span className="text-xs text-slate-500">{i.occurrence_date}</span> },
    { key: "severity", header: "Severity", render: (i) => <RiskBadge level={i.severity} /> },
    { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
    { key: "financial_loss", header: "Loss (IDR)", align: "right", render: (i) => <span className="font-mono">{Number(i.financial_loss || 0).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Incidents &amp; Loss Events</h1><p className="text-sm text-slate-500 mt-1">{list.length} incidents · Total loss IDR {totalLoss.toLocaleString()}</p></div>
        <Button onClick={() => { setEditing({ title:"", description:"", business_unit:"", occurrence_date: new Date().toISOString().slice(0,10), severity:"Medium", status:"Reported", financial_loss: 0, root_cause:"", corrective_actions:"" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white" data-testid="add-incident-btn"><Plus className="w-4 h-4 mr-1" />Report Incident</Button>
      </div>

      <DataTable columns={columns} rows={list} searchKeys={["incident_code","title","business_unit","severity","status"]} rowKey={(i)=>i.id} emptyText="No incidents reported."
        actions={(i) => (<RowActions><IconAction icon={Pencil} label="Edit" tone="primary" onClick={() => { setEditing(i); setOpen(true); }} /></RowActions>)}
      />

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
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
