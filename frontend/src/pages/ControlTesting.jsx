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

const RES = ["Passed","Partially Passed","Failed","Not Tested"];
const resStyle = (r) => r === "Passed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
  : r === "Failed" ? "bg-rose-50 text-rose-700 border-rose-200"
  : r === "Partially Passed" ? "bg-amber-50 text-amber-700 border-amber-200"
  : "bg-slate-100 text-slate-700 border-slate-200";

export default function ControlTesting() {
  const [list, setList] = useState([]);
  const [risks, setRisks] = useState([]);
  const [editing, setEditing] = useState(null); const [open, setOpen] = useState(false);
  const load = () => api.get("/control-tests").then(r=>setList(r.data));
  useEffect(() => { load(); api.get("/risks").then(r=>setRisks(r.data)); }, []);
  const riskMap = Object.fromEntries(risks.map(r=>[r.id, r]));
  const save = async () => { try { editing.id ? await api.put(`/control-tests/${editing.id}`, editing) : await api.post("/control-tests", editing); toast.success("Saved"); setOpen(false); load(); } catch { toast.error("Failed"); } };

  const columns = [
    { key: "risk", header: "Risk", render: (t) => <span className="font-mono text-xs text-teal-700 font-semibold">{riskMap[t.risk_id]?.risk_id||"—"}</span> },
    { key: "test_period", header: "Period", render: (t) => <span className="text-xs">{t.test_period}</span> },
    { key: "test_type", header: "Type" },
    { key: "tester", header: "Tester" },
    { key: "test_result", header: "Result", render: (t) => <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${resStyle(t.test_result)}`}>{t.test_result}</span> },
    { key: "deficiency", header: "Deficiency", render: (t) => t.deficiency ? <span className="text-rose-600 font-semibold text-xs">YES</span> : <span className="text-slate-400 text-xs">—</span> },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Control Testing &amp; Assurance</h1><p className="text-sm text-slate-500 mt-1">{list.length} tests · {list.filter(t=>t.test_result==="Failed").length} failed · {list.filter(t=>t.deficiency).length} deficiencies</p></div>
        <Button onClick={()=>{ setEditing({ risk_id:"", control_id:"", test_period: new Date().toISOString().slice(0,7), test_type:"Combined Test", test_procedure:"", tester:"", sample_size:0, sample_description:"", test_result:"Not Tested", findings:"", evidence_notes:"", deficiency:false, remediation_required:false, remediation_action:"", remediation_owner:"", remediation_due_date:"", status:"Draft" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4 mr-1" />New Test</Button>
      </div>
      <DataTable columns={columns} rows={list} searchKeys={["tester","test_type","test_result","status"]} rowKey={(t)=>t.id} emptyText="No tests yet."
        actions={(t) => (<RowActions><IconAction icon={Pencil} label="Edit" tone="primary" onClick={() => { setEditing(t); setOpen(true); }} /></RowActions>)}
      />
      <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editing?.id?"Edit":"New"} Control Test</DialogTitle></DialogHeader>{editing && <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Risk</Label><Select value={editing.risk_id} onValueChange={v=>setEditing({...editing, risk_id:v})}><SelectTrigger><SelectValue placeholder="Select risk" /></SelectTrigger><SelectContent>{risks.map(r=><SelectItem key={r.id} value={r.id}>{r.risk_id} · {r.title}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Test Period</Label><Input type="month" value={editing.test_period} onChange={e=>setEditing({...editing, test_period:e.target.value})} /></div>
        <div><Label>Type</Label><Select value={editing.test_type} onValueChange={v=>setEditing({...editing, test_type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Design Effectiveness","Operating Effectiveness","Combined Test"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Tester</Label><Input value={editing.tester} onChange={e=>setEditing({...editing, tester:e.target.value})} /></div>
        <div><Label>Sample Size</Label><Input type="number" value={editing.sample_size} onChange={e=>setEditing({...editing, sample_size:Number(e.target.value)})} /></div>
        <div><Label>Result</Label><Select value={editing.test_result} onValueChange={v=>setEditing({...editing, test_result:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Status</Label><Select value={editing.status} onValueChange={v=>setEditing({...editing, status:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Draft","In Progress","Submitted","Reviewed","Closed"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2"><Label>Test Procedure</Label><Textarea rows={2} value={editing.test_procedure} onChange={e=>setEditing({...editing, test_procedure:e.target.value})} /></div>
        <div className="col-span-2"><Label>Findings</Label><Textarea rows={2} value={editing.findings} onChange={e=>setEditing({...editing, findings:e.target.value})} /></div>
        <div className="flex items-center gap-2"><input type="checkbox" checked={editing.deficiency} onChange={e=>setEditing({...editing, deficiency:e.target.checked})} /><Label className="!mt-0">Deficiency identified</Label></div>
        <div className="flex items-center gap-2"><input type="checkbox" checked={editing.remediation_required} onChange={e=>setEditing({...editing, remediation_required:e.target.checked})} /><Label className="!mt-0">Remediation required</Label></div>
        <div className="col-span-2"><Label>Remediation Action</Label><Textarea rows={2} value={editing.remediation_action} onChange={e=>setEditing({...editing, remediation_action:e.target.value})} /></div>
        <div><Label>Remediation Owner</Label><Input value={editing.remediation_owner} onChange={e=>setEditing({...editing, remediation_owner:e.target.value})} /></div>
        <div><Label>Remediation Due</Label><Input type="date" value={editing.remediation_due_date} onChange={e=>setEditing({...editing, remediation_due_date:e.target.value})} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
