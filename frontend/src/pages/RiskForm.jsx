import React, { useEffect, useState, useMemo } from "react";
import { api, calcScore, calcLevel, RISK_LEVEL_SOLID } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskBadge, AppetiteBadge } from "@/lib/badges";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const SOURCES = ["Workshop","Incident","Audit Finding","Regulation","Management Review","Operational Process"];
const FREQS = ["Daily","Weekly","Monthly","Quarterly","Annually","Ad Hoc"];
const REVIEW = ["Monthly","Quarterly","Semi-Annually","Annually"];
const EFF = ["Effective","Partially Effective","Ineffective","Not Tested"];
const C_TYPES = ["Preventive","Detective","Corrective","Manual","Automated","Policy-Based","System-Based"];

const empty = {
  title: "", description: "", category_id: "", business_unit: "", process: "", cause: "", potential_impact: "",
  source: "Workshop", owner_id: "", inherent_likelihood: 3, inherent_impact: 3, residual_likelihood: 2, residual_impact: 2,
  inherent_justification: "", last_review_date: "", next_review_date: "", review_frequency: "Annually", remarks: "", controls: [],
};

const newControl = () => ({
  control_name: "", description: "", control_type: "Preventive", control_owner: "",
  frequency: "Monthly", design_effectiveness: "Not Tested", operating_effectiveness: "Not Tested", evidence_notes: "",
});

export default function RiskForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(empty);
  const [cats, setCats] = useState([]);
  const [appetites, setAppetites] = useState([]);
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data));
    api.get("/appetites").then((r) => setAppetites(r.data));
    api.get("/users").then((r) => setUsers(r.data)).catch(()=>{});
    if (id) api.get(`/risks/${id}`).then((r) => setForm({ ...empty, ...r.data }));
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCtrl = (i, k, v) => setForm((f) => { const cs = [...f.controls]; cs[i] = { ...cs[i], [k]: v }; return { ...f, controls: cs }; });

  const iScore = calcScore(form.inherent_likelihood, form.inherent_impact);
  const iLevel = calcLevel(iScore);
  const rScore = calcScore(form.residual_likelihood, form.residual_impact);
  const rLevel = calcLevel(rScore);
  const appetiteForCat = useMemo(() => appetites.find((a) => a.category_id === form.category_id)?.appetite_level || "Medium", [appetites, form.category_id]);
  const RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  const appStatus = RANK[rLevel] > RANK[appetiteForCat] ? "Exceeds Appetite" : "Within Appetite";

  const save = async (submit=false) => {
    if (!form.title || !form.category_id) { toast.error("Title and category are required"); return; }
    setBusy(true);
    try {
      const payload = { ...form,
        inherent_likelihood: Number(form.inherent_likelihood), inherent_impact: Number(form.inherent_impact),
        residual_likelihood: Number(form.residual_likelihood), residual_impact: Number(form.residual_impact) };
      const res = id ? await api.put(`/risks/${id}`, payload) : await api.post("/risks", payload);
      const rid = id || res.data.id;
      if (submit) await api.post(`/risks/${rid}/submit`);
      toast.success(submit ? "Risk submitted for review" : "Risk saved");
      nav(`/risks/${rid}`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">{id ? "Edit Risk" : "Create Risk"}</h1>
        <p className="text-sm text-slate-500 mt-1">Complete the assessment in five sections.</p>
      </div>

      <Section title="A. Risk Identification">
        <Field label="Risk Title *"><Input data-testid="field-title" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Risk Category *">
          <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
            <SelectTrigger data-testid="field-category"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Description" full><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Business Unit"><Input value={form.business_unit} onChange={(e) => set("business_unit", e.target.value)} /></Field>
        <Field label="Process / Activity"><Input value={form.process} onChange={(e) => set("process", e.target.value)} /></Field>
        <Field label="Risk Cause" full><Textarea rows={2} value={form.cause} onChange={(e) => set("cause", e.target.value)} /></Field>
        <Field label="Potential Impact" full><Textarea rows={2} value={form.potential_impact} onChange={(e) => set("potential_impact", e.target.value)} /></Field>
        <Field label="Risk Source">
          <Select value={form.source} onValueChange={(v) => set("source", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        </Field>
        <Field label="Risk Owner">
          <Select value={form.owner_id} onValueChange={(v) => set("owner_id", v)}><SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.role}</SelectItem>)}</SelectContent></Select>
        </Field>
      </Section>

      <Section title="B. Inherent Risk Assessment">
        <Field label="Inherent Likelihood (1-5)"><LikertSelect value={form.inherent_likelihood} onChange={(v) => set("inherent_likelihood", v)} testid="inh-likelihood" /></Field>
        <Field label="Inherent Impact (1-5)"><LikertSelect value={form.inherent_impact} onChange={(v) => set("inherent_impact", v)} testid="inh-impact" /></Field>
        <div className="md:col-span-2 grid grid-cols-3 gap-3">
          <Stat label="Score" value={iScore} />
          <Stat label="Level" value={<RiskBadge level={iLevel} />} />
          <Stat label="Solid" value={<div className="w-6 h-6 rounded" style={{ background: RISK_LEVEL_SOLID[iLevel] }} />} />
        </div>
        <Field label="Justification" full><Textarea rows={2} value={form.inherent_justification} onChange={(e) => set("inherent_justification", e.target.value)} /></Field>
      </Section>

      <Section title="C. Existing Controls">
        <div className="md:col-span-2 space-y-3">
          {form.controls.map((c, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3 relative bg-slate-50/50" data-testid={`control-${i}`}>
              <button type="button" onClick={() => set("controls", form.controls.filter((_, j) => j !== i))} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              <Field label="Control Name"><Input value={c.control_name} onChange={(e) => setCtrl(i, "control_name", e.target.value)} /></Field>
              <Field label="Type"><Select value={c.control_type} onValueChange={(v) => setCtrl(i, "control_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{C_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Owner"><Input value={c.control_owner} onChange={(e) => setCtrl(i, "control_owner", e.target.value)} /></Field>
              <Field label="Frequency"><Select value={c.frequency} onValueChange={(v) => setCtrl(i, "frequency", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FREQS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Design Effectiveness"><Select value={c.design_effectiveness} onValueChange={(v) => setCtrl(i, "design_effectiveness", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EFF.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Operating Effectiveness"><Select value={c.operating_effectiveness} onValueChange={(v) => setCtrl(i, "operating_effectiveness", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EFF.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Description" full><Textarea rows={2} value={c.description} onChange={(e) => setCtrl(i, "description", e.target.value)} /></Field>
              <Field label="Evidence Notes" full><Textarea rows={2} value={c.evidence_notes} onChange={(e) => setCtrl(i, "evidence_notes", e.target.value)} /></Field>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => set("controls", [...form.controls, newControl()])} data-testid="add-control"><Plus className="w-4 h-4 mr-2" />Add Control</Button>
        </div>
      </Section>

      <Section title="D. Residual Risk Assessment">
        <Field label="Residual Likelihood (1-5)"><LikertSelect value={form.residual_likelihood} onChange={(v) => set("residual_likelihood", v)} testid="res-likelihood" /></Field>
        <Field label="Residual Impact (1-5)"><LikertSelect value={form.residual_impact} onChange={(v) => set("residual_impact", v)} testid="res-impact" /></Field>
        <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Inherent" value={`${iScore} · ${iLevel}`} />
          <Stat label="Residual" value={`${rScore} · ${rLevel}`} />
          <Stat label="Appetite" value={<RiskBadge level={appetiteForCat} />} />
          <Stat label="Status" value={<AppetiteBadge status={appStatus} />} />
          <Stat label="Heatmap" value={<div className="w-6 h-6 rounded" style={{ background: RISK_LEVEL_SOLID[rLevel] }} />} />
        </div>
        {appStatus === "Exceeds Appetite" && (
          <div className="md:col-span-2 flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>Residual risk exceeds the configured risk appetite. A treatment plan is required.</div>
          </div>
        )}
      </Section>

      <Section title="E. Review Information">
        <Field label="Last Review Date"><Input type="date" value={form.last_review_date} onChange={(e) => set("last_review_date", e.target.value)} /></Field>
        <Field label="Next Review Date"><Input type="date" value={form.next_review_date} onChange={(e) => set("next_review_date", e.target.value)} /></Field>
        <Field label="Review Frequency"><Select value={form.review_frequency} onValueChange={(v) => set("review_frequency", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REVIEW.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Remarks" full><Textarea rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /></Field>
      </Section>

      <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-white/80 backdrop-blur border-t border-slate-200 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4">
        <Button variant="outline" onClick={() => nav(-1)}>Cancel</Button>
        <Button variant="outline" onClick={() => save(false)} disabled={busy} data-testid="save-draft-btn">Save as Draft</Button>
        <Button onClick={() => save(true)} disabled={busy} className="bg-blue-700 hover:bg-blue-800" data-testid="submit-risk-btn">Submit for Review</Button>
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <Card className="p-5">
    <h2 className="font-heading text-lg font-semibold text-slate-800 mb-4 pb-3 border-b border-slate-100">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </Card>
);

const Field = ({ label, children, full }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <Label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
    <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{label}</div>
    <div className="text-sm font-semibold text-slate-800 mt-0.5 flex items-center gap-2">{value}</div>
  </div>
);

const LikertSelect = ({ value, onChange, testid }) => (
  <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
    <SelectTrigger data-testid={testid}><SelectValue /></SelectTrigger>
    <SelectContent>{[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
  </Select>
);
