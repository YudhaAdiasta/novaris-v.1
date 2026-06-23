import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Tiny CSV parser (handles quoted fields, commas, newlines)
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQuotes) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && n === "\n") i++;
        row.push(field); field = ""; rows.push(row); row = [];
      } else field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ""));
}

export default function FeedUploadWizard() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [groups, setGroups] = useState([]);
  const [group, setGroup] = useState("");
  const [period, setPeriod] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [records, setRecords] = useState([]);
  const [isRevision, setIsRevision] = useState(false);
  const [requireSecondLevel, setRequireSecondLevel] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get("/feeds/groups").then((r) => setGroups(r.data)); }, []);
  const groupCfg = useMemo(() => groups.find((g) => g.key === group), [groups, group]);

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(String(ev.target.result || ""));
      if (!rows.length) { toast.error("Empty file"); return; }
      const hdr = rows[0].map(h => h.trim());
      const data = rows.slice(1).map(r => Object.fromEntries(hdr.map((h, i) => [h, (r[i] ?? "").trim()])));
      setHeaders(hdr);
      setRecords(data);
      toast.success(`${data.length} rows parsed`);
    };
    reader.readAsText(f);
  };

  const submit = async () => {
    if (!group || !period || !records.length) { toast.error("Pick group, period, and a file"); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/feeds/batches", { group, period, source_file_name: fileName, records, is_revision: isRevision, required_approval_levels: requireSecondLevel ? 2 : 1 });
      toast.success(`Batch ${data.batch_code} created — ${data.failed_records} validation errors`);
      nav(`/feeds/batches/${data.id}`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Upload failed"); }
    finally { setBusy(false); }
  };

  const missingCols = groupCfg && headers.length ? groupCfg.required.filter(r => !headers.includes(r)) : [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">New Data Feed Upload</h1>
        <p className="text-sm text-slate-500 mt-1">Two steps: pick a feed group + period and upload a CSV, then review the parsed data before submitting for approval.</p>
      </div>

      <div className="flex items-center gap-4">
        <Stepper active={step === 1} label="1. Select & Upload" />
        <ChevronRight className="w-4 h-4 text-slate-300" />
        <Stepper active={step === 2} label="2. Review & Submit" />
      </div>

      {step === 1 && (
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Feed Group</Label>
              <Select value={group} onValueChange={setGroup}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a feed group" /></SelectTrigger>
                <SelectContent>{groups.map((g) => <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Period</Label>
              <Input className="mt-1" placeholder="e.g. 2026-Q1, 2026-03, 2026-H1, 2026-FY" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
          </div>

          {groupCfg && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">{groupCfg.fields.length} fields expected.</span> Required: <span className="font-mono">{groupCfg.required.join(", ")}</span>
            </div>
          )}

          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
            <div>
              <Label className="!mt-0">Mark as revision batch</Label>
              <div className="text-xs text-slate-500">Required to overwrite an already-processed period.</div>
            </div>
            <Switch checked={isRevision} onCheckedChange={setIsRevision} />
          </div>

          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
            <div>
              <Label className="!mt-0">Require 2nd-level approver</Label>
              <div className="text-xs text-slate-500">Enable for high-impact batches — needs Maker + Reviewer + Approver before processing.</div>
            </div>
            <Switch checked={requireSecondLevel} onCheckedChange={setRequireSecondLevel} data-testid="require-second-level" />
          </div>

          <div className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-8 bg-slate-50">
            <label className="flex flex-col items-center gap-2 cursor-pointer text-center">
              <Upload className="w-8 h-8 text-teal-600" />
              <span className="text-sm font-medium text-slate-700">{fileName || "Click to choose a CSV file"}</span>
              <span className="text-xs text-slate-500">Use the template button on the Batches page if you need a starter file.</span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </label>
          </div>

          {records.length > 0 && (
            <div className="text-xs text-slate-600 bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Parsed <span className="font-semibold">{records.length}</span> rows · {headers.length} columns
            </div>
          )}
          {missingCols.length > 0 && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Missing required columns: <span className="font-mono">{missingCols.join(", ")}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => nav("/feeds")}>Cancel</Button>
            <Button disabled={!group || !period || !records.length || missingCols.length > 0} onClick={() => setStep(2)} className="bg-teal-600 hover:bg-teal-700 text-white">Review →</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Info label="Group" value={groupCfg?.label} />
            <Info label="Period" value={period} />
            <Info label="Rows" value={records.length} />
          </div>
          <div className="overflow-auto border border-slate-200 rounded-lg max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0"><tr>{headers.map((h) => <th key={h} className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">{h}</th>)}</tr></thead>
              <tbody>
                {records.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-slate-100">{headers.map((h) => <td key={h} className="py-1.5 px-2 whitespace-nowrap">{String(r[h] ?? "—").slice(0, 60)}</td>)}</tr>
                ))}
              </tbody>
            </table>
            {records.length > 50 && <div className="p-2 text-xs text-slate-400 text-center">Showing first 50 of {records.length} rows</div>}
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4 mr-1" />Back</Button>
            <Button disabled={busy} onClick={submit} className="bg-teal-600 hover:bg-teal-700 text-white">Submit batch for validation & review →</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const Stepper = ({ active, label }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${active ? "bg-teal-50 border-teal-300 text-teal-700 font-medium" : "bg-white border-slate-200 text-slate-500"}`}>
    <span className="text-xs">{label}</span>
  </div>
);

const Info = ({ label, value }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
    <div className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{label}</div>
    <div className="text-sm font-semibold text-slate-800 mt-0.5">{value || "—"}</div>
  </div>
);
