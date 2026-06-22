import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Key Risk Indicators</h1><p className="text-sm text-slate-500 mt-1">{list.length} KRIs · {list.filter(k=>k.status==="Red").length} in red</p></div>
        <Button onClick={() => { setEditing({ name:"", unit:"", frequency:"Monthly", threshold_green:0, threshold_amber:0, threshold_red:0, current_value:0, direction:"higher_is_worse", description:"" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700" data-testid="add-kri-btn"><Plus className="w-4 h-4 mr-2" />Add KRI</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm" data-testid="kri-table">
          <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2.5 px-3">Name</th><th className="text-left py-2.5 px-3">Current</th><th className="text-left py-2.5 px-3">Green ≤</th><th className="text-left py-2.5 px-3">Amber ≤</th><th className="text-left py-2.5 px-3">Red ≥</th><th className="text-left py-2.5 px-3">Frequency</th><th className="text-left py-2.5 px-3">Status</th><th></th></tr></thead>
          <tbody>
            {list.map((k) => (
              <tr key={k.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{k.name}</td>
                <td className="py-2.5 px-3 font-mono">{k.current_value} {k.unit}</td>
                <td className="py-2.5 px-3 font-mono text-emerald-700">{k.threshold_green}</td>
                <td className="py-2.5 px-3 font-mono text-amber-700">{k.threshold_amber}</td>
                <td className="py-2.5 px-3 font-mono text-rose-700">{k.threshold_red}</td>
                <td className="py-2.5 px-3">{k.frequency}</td>
                <td className="py-2.5 px-3"><span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLOR[k.status]}`}>{k.status}{k.status!=="Green" && <AlertTriangle className="w-3 h-3 inline ml-1" />}</span></td>
                <td className="py-2.5 px-3"><Button size="sm" variant="outline" onClick={() => { setEditing(k); setOpen(true); }}>Update</Button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="8" className="py-10 text-center text-slate-400">No KRIs configured.</td></tr>}
          </tbody>
        </table>
      </Card>
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
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700">Save</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
