import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function RiskTaxonomy() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.get("/categories").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (editing.id) await api.put(`/categories/${editing.id}`, editing);
      else await api.post("/categories", editing);
      toast.success("Saved"); setOpen(false); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Taxonomy</h1><p className="text-sm text-slate-500 mt-1">{list.length} categories</p></div>
        <Button onClick={() => { setEditing({ code:"", name:"", description:"", status:"Active" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />Add Category</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2.5 px-3">Code</th><th className="text-left py-2.5 px-3">Name</th><th className="text-left py-2.5 px-3">Description</th><th className="text-left py-2.5 px-3">Status</th><th></th></tr></thead><tbody>
          {list.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2.5 px-3 font-mono text-xs">{c.code}</td><td className="py-2.5 px-3 font-medium">{c.name}</td><td className="py-2.5 px-3 text-slate-600">{c.description}</td><td className="py-2.5 px-3">{c.status}</td>
              <td className="py-2.5 px-3"><Button size="sm" variant="outline" onClick={() => { setEditing(c); setOpen(true); }}>Edit</Button></td>
            </tr>
          ))}
        </tbody></table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
        {editing && <div className="space-y-3">
          <div><Label>Code</Label><Input value={editing.code} onChange={(e) => setEditing({...editing, code: e.target.value})} /></div>
          <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({...editing, name: e.target.value})} /></div>
          <div><Label>Description</Label><Textarea value={editing.description} onChange={(e) => setEditing({...editing, description: e.target.value})} /></div>
          <div><Label>Status</Label><Select value={editing.status} onValueChange={(v) => setEditing({...editing, status: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent></Select></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700">Save</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
