import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/lib/badges";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";

export default function Obligations() {
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null); const [open, setOpen] = useState(false);
  const load = () => api.get("/obligations").then(r=>setList(r.data));
  useEffect(() => { load(); api.get("/categories").then(r=>setCats(r.data)); }, []);
  const save = async () => { try { editing.id ? await api.put(`/obligations/${editing.id}`, editing) : await api.post("/obligations", editing); toast.success("Saved"); setOpen(false); load(); } catch { toast.error("Failed"); } };

  const columns = [
    { key: "title", header: "Title", render: (o) => <span className="font-medium">{o.title}</span> },
    { key: "obligation_type", header: "Type" },
    { key: "regulator", header: "Regulator", render: (o) => <span className="text-xs">{o.regulator}</span> },
    { key: "frequency", header: "Frequency" },
    { key: "due_date", header: "Due", render: (o) => <span className="text-xs font-mono">{o.due_date || "—"}</span> },
    { key: "status", header: "Status", render: (o) => <StatusBadge status={o.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Compliance Obligations</h1><p className="text-sm text-slate-500 mt-1">{list.length} obligations · {list.filter(o=>o.status==="Overdue").length} overdue</p></div>
        <Button onClick={()=>{ setEditing({ title:"", description:"", obligation_type:"Regulatory", regulator:"", regulation_ref:"", frequency:"Quarterly", due_date:"", reminder_days:14, status:"Not Started", evidence_notes:"", remarks:"" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4 mr-1" />Add</Button>
      </div>
      <DataTable columns={columns} rows={list} searchKeys={["title","regulator","obligation_type","status"]} rowKey={(o)=>o.id} emptyText="No obligations yet."
        actions={(o) => (<RowActions><IconAction icon={Pencil} label="Edit" tone="primary" onClick={() => { setEditing(o); setOpen(true); }} /></RowActions>)}
      />
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>{editing?.id?"Edit":"Add"} Obligation</DialogTitle></DialogHeader>{editing && <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Title</Label><Input value={editing.title} onChange={e=>setEditing({...editing, title:e.target.value})} /></div>
        <div><Label>Type</Label><Select value={editing.obligation_type} onValueChange={v=>setEditing({...editing, obligation_type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Regulatory","Internal Policy","Audit","Management","Committee"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Regulator</Label><Input value={editing.regulator} onChange={e=>setEditing({...editing, regulator:e.target.value})} /></div>
        <div><Label>Regulation Ref</Label><Input value={editing.regulation_ref} onChange={e=>setEditing({...editing, regulation_ref:e.target.value})} /></div>
        <div><Label>Frequency</Label><Select value={editing.frequency} onValueChange={v=>setEditing({...editing, frequency:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["One-Time","Monthly","Quarterly","Semi-Annually","Annually","Ad Hoc"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Due Date</Label><Input type="date" value={editing.due_date} onChange={e=>setEditing({...editing, due_date:e.target.value})} /></div>
        <div><Label>Reminder Days</Label><Input type="number" value={editing.reminder_days} onChange={e=>setEditing({...editing, reminder_days:Number(e.target.value)})} /></div>
        <div><Label>Status</Label><Select value={editing.status} onValueChange={v=>setEditing({...editing, status:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Not Started","In Progress","Submitted","Approved","Overdue","Waived"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Category</Label><Select value={editing.category_id||""} onValueChange={v=>setEditing({...editing, category_id:v})}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{cats.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2"><Label>Description</Label><Textarea value={editing.description} onChange={e=>setEditing({...editing, description:e.target.value})} /></div>
        <div className="col-span-2"><Label>Evidence Notes</Label><Textarea value={editing.evidence_notes} onChange={e=>setEditing({...editing, evidence_notes:e.target.value})} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
