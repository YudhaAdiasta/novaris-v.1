import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/lib/badges";
import { toast } from "sonner";
import { Plus, Pencil, Calendar as CalIcon } from "lucide-react";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";

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
  const toggleActive = async (c) => { const next = { ...c, status: c.status === "Active" ? "Inactive" : "Active" }; await api.put(`/committees/${c.id}`, next); load(); };

  const cColumns = [
    { key: "name", header: "Name", render: (c) => <span className="font-medium text-slate-800">{c.name}</span> },
    { key: "type", header: "Type" },
    { key: "meeting_frequency", header: "Frequency" },
    { key: "status", header: "Active", render: (c) => (<div className="flex items-center gap-2"><Switch checked={c.status==="Active"} onCheckedChange={()=>toggleActive(c)} /><span className={`text-xs ${c.status==="Active"?"text-teal-700":"text-slate-400"}`}>{c.status}</span></div>) },
  ];
  const mColumns = [
    { key: "meeting_code", header: "Code", render: (m) => <span className="font-mono text-xs text-teal-700 font-semibold">{m.meeting_code}</span> },
    { key: "title", header: "Title", render: (m) => <span className="font-medium">{m.title}</span> },
    { key: "meeting_date", header: "When", render: (m) => <span className="text-xs">{m.meeting_date} {m.start_time}</span> },
    { key: "status", header: "Status", render: (m) => <StatusBadge status={m.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Committee &amp; Meetings</h1><p className="text-sm text-slate-500 mt-1">{committees.length} committees · {meetings.length} meetings</p></div>
        <div className="flex gap-2">
          <Button variant={tab==="committees"?"default":"outline"} onClick={()=>setTab("committees")} className={tab==="committees"?"bg-teal-600 hover:bg-teal-700 text-white":""}>Committees</Button>
          <Button variant={tab==="meetings"?"default":"outline"} onClick={()=>setTab("meetings")} className={tab==="meetings"?"bg-teal-600 hover:bg-teal-700 text-white":""}>Meetings</Button>
        </div>
      </div>
      {tab === "committees" ? (
        <>
          <div className="flex justify-end"><Button onClick={() => { setEditC({ name:"", type:"Risk Committee", description:"", chairperson:"", secretary:"", meeting_frequency:"Monthly", status:"Active" }); setOpenC(true); }} className="bg-teal-600 hover:bg-teal-700 text-white"><Plus className="w-4 h-4 mr-1" />Add Committee</Button></div>
          <DataTable columns={cColumns} rows={committees} searchKeys={["name","type"]} rowKey={(c)=>c.id} emptyText="No committees yet."
            actions={(c) => (<RowActions><IconAction icon={Pencil} label="Edit" tone="primary" onClick={()=>{ setEditC(c); setOpenC(true); }} /></RowActions>)}
          />
        </>
      ) : (
        <>
          <div className="flex justify-end"><Button onClick={() => { setEditM({ committee_id:"", title:"", meeting_date: new Date().toISOString().slice(0,10), start_time:"09:00", end_time:"10:00", location:"", status:"Scheduled", minutes:"", agenda:[], decisions:[], follow_ups:[] }); setOpenM(true); }} className="bg-teal-600 hover:bg-teal-700 text-white"><CalIcon className="w-4 h-4 mr-1" />Schedule Meeting</Button></div>
          <DataTable columns={mColumns} rows={meetings} searchKeys={["title","meeting_code","status"]} rowKey={(m)=>m.id} emptyText="No meetings yet."
            actions={(m) => (<RowActions><IconAction icon={Pencil} label="Open" tone="primary" onClick={()=>{ setEditM(m); setOpenM(true); }} /></RowActions>)}
          />
        </>
      )}
      <Dialog open={openC} onOpenChange={setOpenC}><DialogContent><DialogHeader><DialogTitle>{editC?.id?"Edit":"Add"} Committee</DialogTitle></DialogHeader>{editC && <div className="space-y-3">
        <div><Label>Name</Label><Input value={editC.name} onChange={e=>setEditC({...editC, name:e.target.value})} /></div>
        <div><Label>Type</Label><Select value={editC.type} onValueChange={v=>setEditC({...editC, type:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Risk Committee","Investment Committee","Management Committee","Audit Committee","Board Oversight"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3"><div><Label>Chair</Label><Input value={editC.chairperson} onChange={e=>setEditC({...editC, chairperson:e.target.value})} /></div><div><Label>Secretary</Label><Input value={editC.secretary} onChange={e=>setEditC({...editC, secretary:e.target.value})} /></div></div>
        <div><Label>Frequency</Label><Select value={editC.meeting_frequency} onValueChange={v=>setEditC({...editC, meeting_frequency:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Weekly","Monthly","Quarterly","Semi-Annually","Annually"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Description</Label><Textarea value={editC.description} onChange={e=>setEditC({...editC, description:e.target.value})} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={()=>setOpenC(false)}>Cancel</Button><Button onClick={saveC} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={openM} onOpenChange={setOpenM}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{editM?.id?"Edit":"Schedule"} Meeting</DialogTitle></DialogHeader>{editM && <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Committee</Label><Select value={editM.committee_id} onValueChange={v=>setEditM({...editM, committee_id:v})}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{committees.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2"><Label>Title</Label><Input value={editM.title} onChange={e=>setEditM({...editM, title:e.target.value})} /></div>
        <div><Label>Date</Label><Input type="date" value={editM.meeting_date} onChange={e=>setEditM({...editM, meeting_date:e.target.value})} /></div>
        <div><Label>Status</Label><Select value={editM.status} onValueChange={v=>setEditM({...editM, status:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Scheduled","In Progress","Completed","Cancelled"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>Start</Label><Input type="time" value={editM.start_time} onChange={e=>setEditM({...editM, start_time:e.target.value})} /></div>
        <div><Label>End</Label><Input type="time" value={editM.end_time} onChange={e=>setEditM({...editM, end_time:e.target.value})} /></div>
        <div className="col-span-2"><Label>Location / Link</Label><Input value={editM.location} onChange={e=>setEditM({...editM, location:e.target.value})} /></div>
        <div className="col-span-2"><Label>Minutes of Meeting</Label><Textarea rows={4} value={editM.minutes} onChange={e=>setEditM({...editM, minutes:e.target.value})} /></div>
      </div>}<DialogFooter><Button variant="outline" onClick={()=>setOpenM(false)}>Cancel</Button><Button onClick={saveM} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
