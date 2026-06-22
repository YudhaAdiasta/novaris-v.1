import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RiskBadge, StatusBadge, AppetiteBadge } from "@/lib/badges";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function RiskDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [risk, setRisk] = useState(null);
  const [cats, setCats] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    const r = await api.get(`/risks/${id}`); setRisk(r.data);
    const t = await api.get(`/treatments?risk_id=${id}`); setTreatments(t.data);
    const a = await api.get("/audit"); setAudit(a.data.filter((x) => x.object_id === id));
  };
  useEffect(() => { load(); api.get("/categories").then((r) => setCats(r.data)); api.get("/users").then((r) => setUsers(r.data)).catch(()=>{}); }, [id]);

  if (!risk) return <div className="text-slate-500">Loading…</div>;
  const catName = cats.find((c) => c.id === risk.category_id)?.name || "—";
  const ownerName = users.find((u) => u.id === risk.owner_id)?.name || "—";

  const can = {
    edit: ["admin","risk_officer"].includes(user.role) || (user.role === "risk_owner" && risk.owner_id === user.id && ["Draft","Returned for Revision"].includes(risk.status)),
    submit: risk.status === "Draft" || risk.status === "Returned for Revision",
    review: ["admin","risk_officer"].includes(user.role) && risk.status === "Submitted",
    approve: ["admin","risk_officer","approver"].includes(user.role) && ["Submitted","Under Review"].includes(risk.status),
    treatment: risk.appetite_status === "Exceeds Appetite" && ["admin","risk_owner","risk_officer"].includes(user.role),
  };

  const act = async (path) => {
    try { await api.post(`/risks/${id}/${path}`, { notes }); toast.success("Done"); setDialog(null); setNotes(""); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Action failed"); }
  };

  const createTreatment = async () => {
    try {
      const { data } = await api.post("/treatments", { risk_id: id, action_description: "", treatment_option: "Reduce / Mitigate" });
      toast.success("Treatment plan created");
      nav(`/treatments?focus=${data.id}`);
    } catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-blue-700 font-semibold">{risk.risk_id}</span>
              <StatusBadge status={risk.status} />
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 mt-1">{risk.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {can.edit && <Button variant="outline" asChild><Link to={`/risks/${id}/edit`}><Edit3 className="w-4 h-4 mr-2" />Edit</Link></Button>}
          {can.submit && user.role === "risk_owner" && <Button onClick={() => act("submit")} className="bg-blue-700 hover:bg-blue-800" data-testid="submit-btn">Submit for Review</Button>}
          {can.review && risk.status === "Submitted" && <Button variant="outline" onClick={() => act("review")} data-testid="start-review-btn">Start Review</Button>}
          {can.approve && <Button onClick={() => setDialog("approve")} className="bg-emerald-600 hover:bg-emerald-700" data-testid="approve-risk-btn">Approve</Button>}
          {can.approve && <Button variant="outline" onClick={() => setDialog("return")} data-testid="return-risk-btn">Return</Button>}
          {can.treatment && treatments.length === 0 && <Button onClick={createTreatment} className="bg-purple-600 hover:bg-purple-700" data-testid="create-treatment-btn">Create Treatment Plan</Button>}
        </div>
      </div>

      {risk.appetite_status === "Exceeds Appetite" && (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <div>Residual risk exceeds the configured risk appetite. A treatment plan is required.</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Inherent Score" value={risk.inherent_score} />
        <KPI label="Inherent Level" value={<RiskBadge level={risk.inherent_level} />} />
        <KPI label="Residual Score" value={risk.residual_score} />
        <KPI label="Residual Level" value={<RiskBadge level={risk.residual_level} />} />
        <KPI label="Appetite" value={<><RiskBadge level={risk.appetite_level} /> <AppetiteBadge status={risk.appetite_status} /></>} />
      </div>

      <Card className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Detail label="Category" value={catName} />
        <Detail label="Business Unit" value={risk.business_unit} />
        <Detail label="Process / Activity" value={risk.process} />
        <Detail label="Source" value={risk.source} />
        <Detail label="Owner" value={ownerName} />
        <Detail label="Next Review" value={risk.next_review_date} />
        <Detail label="Description" value={risk.description} full />
        <Detail label="Cause" value={risk.cause} full />
        <Detail label="Potential Impact" value={risk.potential_impact} full />
      </Card>

      <Card className="p-5">
        <h2 className="font-heading text-lg font-semibold text-slate-800 mb-4">Controls</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200"><th className="text-left py-2 px-3">Name</th><th className="text-left py-2 px-3">Type</th><th className="text-left py-2 px-3">Frequency</th><th className="text-left py-2 px-3">Design</th><th className="text-left py-2 px-3">Operating</th><th className="text-left py-2 px-3">Overall</th></tr></thead>
            <tbody>
              {(risk.controls || []).map((c) => (
                <tr key={c.id} className="border-b border-slate-100"><td className="py-2 px-3 font-medium">{c.control_name}</td><td className="py-2 px-3">{c.control_type}</td><td className="py-2 px-3">{c.frequency}</td><td className="py-2 px-3">{c.design_effectiveness}</td><td className="py-2 px-3">{c.operating_effectiveness}</td><td className="py-2 px-3"><span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">{c.overall_effectiveness}</span></td></tr>
              ))}
              {(!risk.controls || risk.controls.length === 0) && <tr><td colSpan="6" className="py-6 text-center text-slate-400">No controls added.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-heading text-lg font-semibold text-slate-800 mb-4">Treatment Plans</h2>
        {treatments.length === 0 ? <div className="text-sm text-slate-400 py-4">No treatment plans yet.</div> :
          <div className="space-y-2">
            {treatments.map((t) => (
              <div key={t.id} className="border border-slate-200 rounded-md p-3 flex items-center justify-between">
                <div><div className="text-sm font-medium">{t.action_description || "(no description)"}</div><div className="text-xs text-slate-500 mt-0.5">{t.treatment_option} · Due {t.target_completion_date || "—"} · {t.progress_percentage}%</div></div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>}
      </Card>

      <Card className="p-5">
        <h2 className="font-heading text-lg font-semibold text-slate-800 mb-4">Approval History</h2>
        {(risk.approval_history || []).length === 0 ? <div className="text-sm text-slate-400">No approval actions yet.</div> :
          <div className="space-y-2">
            {risk.approval_history.map((h, i) => (
              <div key={i} className="text-sm flex items-center justify-between border-b border-slate-100 py-2"><div><span className="font-medium">{h.action}</span> by {h.by} <span className="text-slate-400">({h.role})</span> — {h.notes || "no notes"}</div><div className="text-xs text-slate-400 font-mono">{new Date(h.at).toLocaleString()}</div></div>
            ))}
          </div>}
      </Card>

      <Card className="p-5">
        <h2 className="font-heading text-lg font-semibold text-slate-800 mb-4">Audit Trail</h2>
        <div className="space-y-1.5 text-sm max-h-72 overflow-y-auto">
          {audit.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs border-b border-slate-100 py-1.5"><div><span className="font-medium text-slate-700">{a.action}</span> · {a.user_name} ({a.user_role})</div><div className="text-slate-400 font-mono">{new Date(a.timestamp).toLocaleString()}</div></div>
          ))}
        </div>
      </Card>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog === "approve" ? "Approve Risk" : "Return for Revision"}</DialogTitle></DialogHeader>
          <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={() => act(dialog)} className={dialog === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const KPI = ({ label, value }) => (
  <Card className="p-4">
    <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{label}</div>
    <div className="text-sm font-semibold text-slate-800 mt-2 flex items-center gap-2 flex-wrap">{value}</div>
  </Card>
);
const Detail = ({ label, value, full }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{label}</div>
    <div className="text-sm text-slate-800 mt-1 leading-relaxed">{value || "—"}</div>
  </div>
);
