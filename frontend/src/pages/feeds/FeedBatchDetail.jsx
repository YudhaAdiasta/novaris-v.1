import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/lib/badges";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Download, CheckCircle2, X, AlertTriangle } from "lucide-react";

export default function FeedBatchDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [batch, setBatch] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [notes, setNotes] = useState("");

  const load = () => api.get(`/feeds/batches/${id}`).then((r) => setBatch(r.data));
  useEffect(() => { load(); }, [id]);
  if (!batch) return <div className="text-slate-500">Loading…</div>;

  const canApprove = ["admin","risk_officer"].includes(user.role) && batch.status === "Ready for Review" && batch.failed_records === 0;
  const canReject = ["admin","risk_officer"].includes(user.role) && ["Ready for Review","Validation Failed"].includes(batch.status);

  const act = async (path) => {
    try { await api.post(`/feeds/batches/${id}/${path}`, { notes }); toast.success("Done"); setDlg(null); setNotes(""); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Action failed"); }
  };

  const downloadErrors = async () => {
    const t = localStorage.getItem("novaris_token");
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/feeds/batches/${id}/errors.csv`, { headers: { Authorization: `Bearer ${t}` } });
    const blob = await res.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${batch.batch_code}_errors.csv`; a.click();
  };

  const headers = batch.records?.[0] ? Object.keys(batch.records[0]) : [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-teal-700 font-semibold">{batch.batch_code}</span>
              <StatusBadge status={batch.status} />
              {batch.is_revision && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">Revision</span>}
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 mt-1">{batch.group_label}</h1>
            <p className="text-sm text-slate-500">Period {batch.period} · {batch.total_records} records ({batch.successful_records} valid, {batch.failed_records} errors)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {batch.failed_records > 0 && <Button variant="outline" onClick={downloadErrors}><Download className="w-4 h-4 mr-1" />Errors CSV</Button>}
          {canApprove && <Button onClick={() => setDlg("approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle2 className="w-4 h-4 mr-1" />Approve & Process</Button>}
          {canReject && <Button variant="outline" onClick={() => setDlg("reject")}><X className="w-4 h-4 mr-1" />Reject</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Uploaded By" value={batch.uploaded_by_name} />
        <KPI label="Uploaded At" value={new Date(batch.uploaded_at).toLocaleString()} />
        <KPI label="Total Records" value={batch.total_records} />
        <KPI label="Validation Errors" value={batch.failed_records} tone={batch.failed_records ? "rose" : "emerald"} />
        <KPI label="Approval Levels" value={`${batch.approved_levels || 0} / ${batch.required_approval_levels || 1}`} />
      </div>

      {batch.validation_errors?.length > 0 && (
        <Card className="p-5 border-rose-200">
          <h2 className="font-heading text-base font-semibold text-rose-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Validation Errors</h2>
          <div className="overflow-auto max-h-72 border border-rose-100 rounded-md">
            <table className="w-full text-xs"><thead className="bg-rose-50 sticky top-0"><tr><th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-rose-700">Row</th><th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-rose-700">Field</th><th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-rose-700">Message</th></tr></thead><tbody>
              {batch.validation_errors.map((e, i) => (<tr key={i} className="border-b border-rose-100"><td className="py-1.5 px-2 font-mono text-xs">{e.row}</td><td className="py-1.5 px-2 font-medium">{e.field}</td><td className="py-1.5 px-2 text-slate-700">{e.message}</td></tr>))}
            </tbody></table>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-heading text-base font-semibold text-slate-800 mb-3">Data Preview</h2>
        <div className="overflow-auto max-h-[28rem] border border-slate-200 rounded-md">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0"><tr>{headers.map(h => <th key={h} className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {batch.records?.slice(0, 200).map((r, i) => (<tr key={i} className="border-b border-slate-100">{headers.map(h => <td key={h} className="py-1.5 px-2 whitespace-nowrap">{String(r[h] ?? "—").slice(0, 80)}</td>)}</tr>))}
            </tbody>
          </table>
          {batch.records?.length > 200 && <div className="p-2 text-xs text-slate-400 text-center">Showing 200 of {batch.records.length}</div>}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-heading text-base font-semibold text-slate-800 mb-3">Approval History</h2>
        {!batch.approval_history?.length ? <div className="text-sm text-slate-400">No approval actions yet.</div> :
          <div className="space-y-2">{batch.approval_history.map((h, i) => (
            <div key={i} className="text-sm flex items-center justify-between border-b border-slate-100 py-2">
              <div><span className="font-medium">{h.action}</span> by {h.by} <span className="text-slate-400">({h.role})</span> — {h.notes || "no notes"}</div>
              <div className="text-xs text-slate-400 font-mono">{new Date(h.at).toLocaleString()}</div>
            </div>
          ))}</div>
        }
      </Card>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dlg === "approve" ? "Approve & Process" : "Reject"}</DialogTitle></DialogHeader>
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          {dlg === "approve" && <div className="text-xs text-slate-500">Upon approval the data will be processed into the engine, prior records for this period & group will be replaced, and breach/scoring engines will run.</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button>
            <Button onClick={() => act(dlg)} className={dlg === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-orange-600 hover:bg-orange-700 text-white"}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const KPI = ({ label, value, tone }) => (
  <Card className={`p-4 ${tone === "rose" ? "border-rose-200" : tone === "emerald" ? "border-emerald-200" : ""}`}>
    <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{label}</div>
    <div className={`text-sm font-semibold mt-1 ${tone === "rose" ? "text-rose-700" : tone === "emerald" ? "text-emerald-700" : "text-slate-800"}`}>{value ?? "—"}</div>
  </Card>
);
