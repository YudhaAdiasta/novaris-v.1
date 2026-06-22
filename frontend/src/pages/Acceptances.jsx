import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge, RiskBadge } from "@/lib/badges";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Plus } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Acceptance &amp; Exceptions</h1><p className="text-sm text-slate-500 mt-1">{list.length} requests · {list.filter(a=>a.status==="Approved").length} active · {list.filter(a=>a.status==="Expired").length} expired</p></div>
        <Button onClick={()=>{ setEditing({ request_type:"Risk Acceptance", related_risk_id:"", related_object_type:"Risk", related_object_id:"", title:"", justification:"", residual_risk_level:"Medium", appetite_level:"Medium", reason:"", compensating_controls:"", effective_date: new Date().toISOString().slice(0,10), expiry_date:"", status:"Draft" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />New Request</Button>
      </div>
      <Card className="overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2 px-3">Type</th><th className="text-left py-2 px-3">Title</th><th className="text-left py-2 px-3">Risk</th><th className="text-left py-2 px-3">Level</th><th className="text-left py-2 px-3">Effective</th><th className="text-left py-2 px-3">Expiry</th><th className="text-left py-2 px-3">Status</th><th></th></tr></thead><tbody>
        {list.map(a=>(<tr key={a.id} className={`border-b border-slate-100 hover:bg-slate-50 ${a.status==="Expired"?"bg-rose-50/40":""}`}><td className="py-2 px-3 text-xs">{a.request_type}</td><td className="py-2 px-3 font-medium max-w-md truncate">{a.title}</td><td className="py-2 px-3 font-mono text-xs text-teal-700">{riskMap[a.related_risk_id]?.risk_id||"—"}</td><td className="py-2 px-3"><RiskBadge level={a.residual_risk_level} /></td><td className="py-2 px-3 text-xs">{a.effective_date}</td><td className="py-2 px-3 text-xs">{a.expiry_date}</td><td className="py-2 px-3"><StatusBadge status={a.status} /></td><td className="py-2 px-3 flex gap-1">
          {a.status==="Draft" && <Button size="sm" onClick={()=>action(a.id, "submit")} className="bg-teal-600 hover:bg-teal-700">Submit</Button>}
          {a.status==="Submitted" && ["admin","risk_officer","approver"].includes(user.role) && <><Button size="sm" onClick={()=>action(a.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button><Button size="sm" variant="outline" onClick={()=>action(a.id, "reject")}>Reject</Button></>}
        </td></tr>))}
        {!list.length && <tr><td colSpan="8" className="py-10 text-center text-slate-400">No acceptance requests.</td></tr>}
      </tbody></table></Card>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>New Request</DialogTitle></DialogHeader>{editing && <div className="grid grid-cols-2 gap-3">
        <div><Label>Type</Label><Select value={editing.request_type} onValueChange={v=>setEditing({...editing, request_type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Risk Acceptance","Policy Exception","Limit Exception","Control Exception"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Residual Risk Level</Label><Select value={editing.residual_risk_level} onValueChange={v=>setEditing({...editing, residual_risk_level:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Low","Medium","High","Critical"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2"><Label>Related Risk</Label><Select value={editing.related_risk_id||""} onValueChange={v=>setEditing({...editing, related_risk_id:v})}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{risks.map(r=><SelectItem key={r.id} value={r.id}>{r.risk_id} · {r.title}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2"><Label>Title</Label><Input value={editing.title} onChange={e=>setEditing({...editing, title:e.target.value})} /></div>
        <div className="col-span-2"><Label>Justification</Label><Textarea rows={2} value={editing.justification} onChange={e=>setEditing({...editing, justification:e.target.value})} /></div>
        <div className="col-span-2"><Label>Compensating Controls</Label><Textarea rows={2} value={editing.compensating_controls} onChange={e=>setEditing({...editing, compensating_controls:e.target.value})} /></div>
        <div><Label>Effective Date</Label><Input type="date" value={editing.effective_date} onChange={e=>setEditing({...editing, effective_date:e.target.value})} /></div>
        <div><Label>Expiry Date</Label><Input type="date" value={editing.expiry_date} onChange={e=>setEditing({...editing, expiry_date:e.target.value})} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700">Save Draft</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
