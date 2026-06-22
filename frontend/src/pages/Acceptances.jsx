import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, RiskBadge } from "@/lib/badges";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Plus, Send, CheckCircle2, X } from "lucide-react";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";

export default function Acceptances() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [risks, setRisks] = useState([]);
  const [editing, setEditing] = useState(null); const [open, setOpen] = useState(false);
  const load = () => api.get("/acceptances").then(r=>setList(r.data));
  useEffect(() => { load(); api.get("/risks").then(r=>setRisks(r.data)); }, []);
  const riskMap = Object.fromEntries(risks.map(r=>[r.id, r]));
  const save = async () => { try { await api.post("/acceptances", editing); toast.success("Created"); setOpen(false); load(); } catch { toast.error("Failed"); } };
  const action = async (id, path, notes="") => { try { await api.post(`/acceptances/${id}/${path}`, { notes }); toast.success("Done"); load(); } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); } };

  const columns = [
    { key: "request_type", header: "Type", render: (a) => <span className="text-xs">{a.request_type}</span> },
    { key: "title", header: "Title", render: (a) => <span className="font-medium max-w-md truncate inline-block">{a.title}</span> },
    { key: "risk", header: "Risk", render: (a) => <span className="font-mono text-xs text-teal-700 font-semibold">{riskMap[a.related_risk_id]?.risk_id||"—"}</span> },
    { key: "residual_risk_level", header: "Level", render: (a) => <RiskBadge level={a.residual_risk_level} /> },
    { key: "effective_date", header: "Effective", render: (a) => <span className="text-xs">{a.effective_date}</span> },
    { key: "expiry_date", header: "Expiry", render: (a) => <span className="text-xs">{a.expiry_date}</span> },
    { key: "status", header: "Status", render: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Acceptance &amp; Exceptions</h1><p className="text-sm text-slate-500 mt-1">{list.length} requests · {list.filter(a=>a.status==="Approved").length} active · {list.filter(a=>a.status==="Expired").length} expired</p></div>
        <Button onClick={()=>{ setEditing({ request_type:"Risk Acceptance", related_risk_id:"", related_object_type:"Risk", related_object_id:"", title:"", justification:"", residual_risk_level:"Medium", appetite_level:"Medium", reason:"", compensating_controls:"", effective_date: new Date().toISOString().slice(0,10), expiry_date:"", status:"Draft" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4 mr-1" />New Request</Button>
      </div>
      <DataTable columns={columns} rows={list} searchKeys={["title","request_type","status"]} rowKey={(a)=>a.id} emptyText="No acceptance requests."
        actions={(a) => (
          <RowActions>
            {a.status==="Draft" && <IconAction icon={Send} label="Submit" tone="primary" onClick={()=>action(a.id, "submit")} />}
            {a.status==="Submitted" && ["admin","risk_officer","approver"].includes(user.role) && <>
              <IconAction icon={CheckCircle2} label="Approve" tone="primary" onClick={()=>action(a.id, "approve")} />
              <IconAction icon={X} label="Reject" tone="danger" onClick={()=>action(a.id, "reject")} />
            </>}
          </RowActions>
        )}
      />
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Request</DialogTitle></DialogHeader>{editing && <div className="grid grid-cols-2 gap-3">
        <div><Label>Type</Label><Select value={editing.request_type} onValueChange={v=>setEditing({...editing, request_type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Risk Acceptance","Policy Exception","Limit Exception","Control Exception"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Residual Risk Level</Label><Select value={editing.residual_risk_level} onValueChange={v=>setEditing({...editing, residual_risk_level:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2"><Label>Related Risk</Label><Select value={editing.related_risk_id||""} onValueChange={v=>setEditing({...editing, related_risk_id:v})}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{risks.map(r=><SelectItem key={r.id} value={r.id}>{r.risk_id} · {r.title}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2"><Label>Title</Label><Input value={editing.title} onChange={e=>setEditing({...editing, title:e.target.value})} /></div>
        <div className="col-span-2"><Label>Justification</Label><Textarea rows={2} value={editing.justification} onChange={e=>setEditing({...editing, justification:e.target.value})} /></div>
        <div className="col-span-2"><Label>Compensating Controls</Label><Textarea rows={2} value={editing.compensating_controls} onChange={e=>setEditing({...editing, compensating_controls:e.target.value})} /></div>
        <div><Label>Effective Date</Label><Input type="date" value={editing.effective_date} onChange={e=>setEditing({...editing, effective_date:e.target.value})} /></div>
        <div><Label>Expiry Date</Label><Input type="date" value={editing.expiry_date} onChange={e=>setEditing({...editing, expiry_date:e.target.value})} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save Draft</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
