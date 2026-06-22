import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";
import { toast } from "sonner";
import { Plus, Pencil, AlertTriangle } from "lucide-react";

const STATUS_COLOR = { Green: "bg-emerald-50 text-emerald-700 border-emerald-200", Amber: "bg-amber-50 text-amber-700 border-amber-200", Red: "bg-rose-50 text-rose-700 border-rose-200" };

export default function KRI() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.get("/kris").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const payload = { ...editing,
        threshold_green: Number(editing.threshold_green), threshold_amber: Number(editing.threshold_amber),
        threshold_red: Number(editing.threshold_red), current_value: Number(editing.current_value) };
      if (editing.id) await api.put(`/kris/${editing.id}`, payload); else await api.post("/kris", payload);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const columns = [
    { key: "name", header: "Name", render: (k) => <span className="font-medium text-slate-800">{k.name}</span> },
    { key: "current_value", header: "Current", render: (k) => <span className="font-mono text-slate-700">{k.current_value} {k.unit}</span> },
    { key: "threshold_green", header: "Green ≤", render: (k) => <span className="font-mono text-emerald-700">{k.threshold_green}</span> },
    { key: "threshold_amber", header: "Amber ≤", render: (k) => <span className="font-mono text-amber-700">{k.threshold_amber}</span> },
    { key: "threshold_red", header: "Red ≥", render: (k) => <span className="font-mono text-rose-700">{k.threshold_red}</span> },
    { key: "frequency", header: "Frequency" },
    { key: "status", header: "Status", render: (k) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLOR[k.status]}`}>
        {k.status}{k.status!=="Green" && <AlertTriangle className="w-3 h-3 inline ml-1" />}
      </span>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Key Risk Indicators</h1><p className="text-sm text-slate-500 mt-1">{list.length} KRIs · {list.filter(k=>k.status==="Red").length} in red</p></div>
        <Button onClick={() => { setEditing({ name:"", unit:"", frequency:"Monthly", threshold_green:0, threshold_amber:0, threshold_red:0, current_value:0, direction:"higher_is_worse", description:"" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white" data-testid="add-kri-btn">
          <Plus className="w-4 h-4 mr-1" />Add KRI
        </Button>
      </div>

      <DataTable columns={columns} rows={list} searchKeys={["name","unit","frequency","status"]} rowKey={(k)=>k.id} emptyText="No KRIs configured."
        actions={(k) => (<RowActions><IconAction icon={Pencil} label="Update" tone="primary" onClick={() => { setEditing(k); setOpen(true); }} /></RowActions>)}
      />

      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{editing?.id ? "Update KRI" : "Add KRI"}</DialogTitle></DialogHeader>
        {editing && <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({...editing, name: e.target.value})} /></div>
          <div><Label>Unit</Label><Input value={editing.unit} onChange={(e) => setEditing({...editing, unit: e.target.value})} /></div>
          <div><Label>Frequency</Label><Select value={editing.frequency} onValueChange={(v) => setEditing({...editing, frequency: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Daily","Weekly","Monthly","Quarterly","Annually"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Direction</Label><Select value={editing.direction} onValueChange={(v) => setEditing({...editing, direction: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="higher_is_worse">Higher = Worse</SelectItem><SelectItem value="lower_is_worse">Lower = Worse</SelectItem></SelectContent></Select></div>
          <div><Label>Current Value</Label><Input type="number" step="0.01" value={editing.current_value} onChange={(e) => setEditing({...editing, current_value: e.target.value})} /></div>
          <div><Label>Green Threshold</Label><Input type="number" step="0.01" value={editing.threshold_green} onChange={(e) => setEditing({...editing, threshold_green: e.target.value})} /></div>
          <div><Label>Amber Threshold</Label><Input type="number" step="0.01" value={editing.threshold_amber} onChange={(e) => setEditing({...editing, threshold_amber: e.target.value})} /></div>
          <div><Label>Red Threshold</Label><Input type="number" step="0.01" value={editing.threshold_red} onChange={(e) => setEditing({...editing, threshold_red: e.target.value})} /></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
