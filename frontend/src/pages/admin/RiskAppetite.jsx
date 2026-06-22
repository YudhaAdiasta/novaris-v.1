import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RiskBadge } from "@/lib/badges";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";

export default function RiskAppetite() {
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null); const [open, setOpen] = useState(false);
  const load = () => api.get("/appetites").then((r) => setList(r.data));
  useEffect(() => { load(); api.get("/categories").then((r) => setCats(r.data)); }, []);
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  const save = async () => { try { editing.id ? await api.put(`/appetites/${editing.id}`, editing) : await api.post("/appetites", editing); toast.success("Saved"); setOpen(false); load(); } catch { toast.error("Failed"); } };
  const toggleActive = async (a) => { const next = { ...a, status: a.status === "Active" ? "Inactive" : "Active" }; await api.put(`/appetites/${a.id}`, next); load(); };

  const columns = [
    { key: "category", header: "Category", render: (a) => <span className="font-medium text-slate-800">{catMap[a.category_id]}</span> },
    { key: "appetite_level", header: "Appetite", render: (a) => <RiskBadge level={a.appetite_level} /> },
    { key: "description", header: "Description", render: (a) => <span className="text-slate-600">{a.description}</span> },
    { key: "status", header: "Active", render: (a) => <div className="flex items-center gap-2"><Switch checked={a.status==="Active"} onCheckedChange={()=>toggleActive(a)} /><span className={`text-xs ${a.status==="Active"?"text-teal-700":"text-slate-400"}`}>{a.status}</span></div> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Appetite</h1><p className="text-sm text-slate-500 mt-1">Maximum acceptable residual risk by category</p></div>
        <Button onClick={() => { setEditing({ category_id:"", appetite_level:"Medium", description:"", status:"Active" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4 mr-1" />Add</Button>
      </div>
      <DataTable columns={columns} rows={list} searchKeys={["appetite_level","description"]} rowKey={(a)=>a.id} emptyText="No appetites configured."
        actions={(a) => (<RowActions><IconAction icon={Pencil} label="Edit" tone="primary" onClick={() => { setEditing(a); setOpen(true); }} /></RowActions>)}
      />
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Appetite</DialogTitle></DialogHeader>
        {editing && <div className="space-y-3">
          <div><Label>Category</Label><Select value={editing.category_id} onValueChange={(v) => setEditing({...editing, category_id: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Appetite Level</Label><Select value={editing.appetite_level} onValueChange={(v) => setEditing({...editing, appetite_level: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Description</Label><Textarea value={editing.description} onChange={(e) => setEditing({...editing, description: e.target.value})} /></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
