import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RiskBadge } from "@/lib/badges";
import { toast } from "sonner";

export default function RiskAppetite() {
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.get("/appetites").then((r) => setList(r.data));
  useEffect(() => { load(); api.get("/categories").then((r) => setCats(r.data)); }, []);
  const catMap = Object.fromEntries(cats.map((c)=>[c.id, c.name]));

  const save = async () => {
    try {
      if (editing.id) await api.put(`/appetites/${editing.id}`, editing); else await api.post("/appetites", editing);
      toast.success("Saved"); setOpen(false); load();
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Appetite</h1><p className="text-sm text-slate-500 mt-1">Maximum acceptable residual risk by category</p></div>
        <Button onClick={() => { setEditing({ category_id:"", appetite_level:"Medium", description:"", status:"Active" }); setOpen(true); }} className="bg-blue-700 hover:bg-blue-800">Add</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2.5 px-3">Category</th><th className="text-left py-2.5 px-3">Appetite</th><th className="text-left py-2.5 px-3">Description</th><th className="text-left py-2.5 px-3">Status</th><th></th></tr></thead><tbody>
          {list.map((a) => (
            <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2.5 px-3 font-medium">{catMap[a.category_id]}</td>
              <td className="py-2.5 px-3"><RiskBadge level={a.appetite_level} /></td>
              <td className="py-2.5 px-3 text-slate-600">{a.description}</td>
              <td className="py-2.5 px-3">{a.status}</td>
              <td className="py-2.5 px-3"><Button size="sm" variant="outline" onClick={() => { setEditing(a); setOpen(true); }}>Edit</Button></td>
            </tr>
          ))}
        </tbody></table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Appetite</DialogTitle></DialogHeader>
        {editing && <div className="space-y-3">
          <div><Label>Category</Label><Select value={editing.category_id} onValueChange={(v) => setEditing({...editing, category_id: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Appetite Level</Label><Select value={editing.appetite_level} onValueChange={(v) => setEditing({...editing, appetite_level: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Description</Label><Textarea value={editing.description} onChange={(e) => setEditing({...editing, description: e.target.value})} /></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-blue-700 hover:bg-blue-800">Save</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
