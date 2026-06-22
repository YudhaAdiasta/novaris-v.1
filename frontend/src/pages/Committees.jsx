import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/lib/badges";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function Committees() {
  const [committees, setCommittees] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [tab, setTab] = useState("committees");
  const [editC, setEditC] = useState(null); const [openC, setOpenC] = useState(false);
  const [editM, setEditM] = useState(null); const [openM, setOpenM] = useState(false);
  const load = () => { api.get("/committees").then(r=>setCommittees(r.data)); api.get("/meetings").then(r=>setMeetings(r.data)); };
  useEffect(() => { load(); }, []);

  const saveC = async () => { try { editC.id ? await api.put(`/committees/${editC.id}`, editC) : await api.post("/committees", editC); toast.success("Saved"); setOpenC(false); load(); } catch { toast.error("Failed"); } };
  const saveM = async () => { try { editM.id ? await api.put(`/meetings/${editM.id}`, editM) : await api.post("/meetings", editM); toast.success("Saved"); setOpenM(false); load(); } catch { toast.error("Failed"); } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Committee &amp; Meetings</h1><p className="text-sm text-slate-500 mt-1">{committees.length} committees · {meetings.length} meetings</p></div>
        <div className="flex gap-2">
          <Button variant={tab==="committees"?"default":"outline"} onClick={()=>setTab("committees")} className={tab==="committees"?"bg-blue-700 hover:bg-blue-800":""}>Committees</Button>
          <Button variant={tab==="meetings"?"default":"outline"} onClick={()=>setTab("meetings")} className={tab==="meetings"?"bg-blue-700 hover:bg-blue-800":""}>Meetings</Button>
        </div>
      </div>
      {tab === "committees" ? (
        <Card className="overflow-hidden">
          <div className="p-3 border-b flex justify-end"><Button onClick={() => { setEditC({ name:"", type:"Risk Committee", description:"", chairperson:"", secretary:"", meeting_frequency:"Monthly", status:"Active" }); setOpenC(true); }} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-1" />Add Committee</Button></div>
          <table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2 px-3">Name</th><th className="text-left py-2 px-3">Type</th><th className="text-left py-2 px-3">Frequency</th><th className="text-left py-2 px-3">Status</th><th></th></tr></thead><tbody>
            {committees.map(c => (<tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="py-2 px-3 font-medium">{c.name}</td><td className="py-2 px-3">{c.type}</td><td className="py-2 px-3">{c.meeting_frequency}</td><td className="py-2 px-3">{c.status}</td><td className="py-2 px-3"><Button size="sm" variant="outline" onClick={()=>{ setEditC(c); setOpenC(true); }}>Edit</Button></td></tr>))}
          </tbody></table>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="p-3 border-b flex justify-end"><Button onClick={() => { setEditM({ committee_id:"", title:"", meeting_date: new Date().toISOString().slice(0,10), start_time:"09:00", end_time:"10:00", location:"", status:"Scheduled", minutes:"", agenda:[], decisions:[], follow_ups:[] }); setOpenM(true); }} className="bg-blue-700 hover:bg-blue-800"><Plus className="w-4 h-4 mr-1" />Schedule Meeting</Button></div>
          <table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2 px-3">Code</th><th className="text-left py-2 px-3">Title</th><th className="text-left py-2 px-3">Date</th><th className="text-left py-2 px-3">Status</th><th></th></tr></thead><tbody>
            {meetings.map(m => (<tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50"><td className="py-2 px-3 font-mono text-xs text-blue-700">{m.meeting_code}</td><td className="py-2 px-3 font-medium">{m.title}</td><td className="py-2 px-3 text-xs">{m.meeting_date} {m.start_time}</td><td className="py-2 px-3"><StatusBadge status={m.status} /></td><td className="py-2 px-3"><Button size="sm" variant="outline" onClick={()=>{ setEditM(m); setOpenM(true); }}>Open</Button></td></tr>))}
          </tbody></table>
        </Card>
      )}
      <Dialog open={openC} onOpenChange={setOpenC}><DialogContent><DialogHeader><DialogTitle>{editC?.id?"Edit":"Add"} Committee</DialogTitle></DialogHeader>{editC && <div className="space-y-3">
        <div><Label>Name</Label><Input value={editC.name} onChange={e=>setEditC({...editC, name:e.target.value})} /></div>
        <div><Label>Type</Label><Select value={editC.type} onValueChange={v=>setEditC({...editC, type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Risk Committee","Investment Committee","Management Committee","Audit Committee","Board Oversight"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Chair</Label><Input value={editC.chairperson} onChange={e=>setEditC({...editC, chairperson:e.target.value})} /></div><div><Label>Secretary</Label><Input value={editC.secretary} onChange={e=>setEditC({...editC, secretary:e.target.value})} /></div></div>
        <div><Label>Frequency</Label><Select value={editC.meeting_frequency} onValueChange={v=>setEditC({...editC, meeting_frequency:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Weekly","Monthly","Quarterly","Semi-Annually","Annually"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Description</Label><Textarea value={editC.description} onChange={e=>setEditC({...editC, description:e.target.value})} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={()=>setOpenC(false)}>Cancel</Button><Button onClick={saveC} className="bg-blue-700 hover:bg-blue-800">Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={openM} onOpenChange={setOpenM}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editM?.id?"Edit":"Schedule"} Meeting</DialogTitle></DialogHeader>{editM && <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Committee</Label><Select value={editM.committee_id} onValueChange={v=>setEditM({...editM, committee_id:v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{committees.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2"><Label>Title</Label><Input value={editM.title} onChange={e=>setEditM({...editM, title:e.target.value})} /></div>
        <div><Label>Date</Label><Input type="date" value={editM.meeting_date} onChange={e=>setEditM({...editM, meeting_date:e.target.value})} /></div>
        <div><Label>Status</Label><Select value={editM.status} onValueChange={v=>setEditM({...editM, status:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Scheduled","In Progress","Completed","Cancelled"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Start</Label><Input type="time" value={editM.start_time} onChange={e=>setEditM({...editM, start_time:e.target.value})} /></div>
        <div><Label>End</Label><Input type="time" value={editM.end_time} onChange={e=>setEditM({...editM, end_time:e.target.value})} /></div>
        <div className="col-span-2"><Label>Location / Link</Label><Input value={editM.location} onChange={e=>setEditM({...editM, location:e.target.value})} /></div>
        <div className="col-span-2"><Label>Minutes of Meeting</Label><Textarea rows={4} value={editM.minutes} onChange={e=>setEditM({...editM, minutes:e.target.value})} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={()=>setOpenM(false)}>Cancel</Button><Button onClick={saveM} className="bg-blue-700 hover:bg-blue-800">Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
