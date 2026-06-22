import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

const SOURCES = {
  "Risk Register": { ep: "/risks", fields: ["risk_id","title","business_unit","inherent_score","inherent_level","residual_score","residual_level","appetite_level","appetite_status","status","next_review_date"] },
  "Incidents": { ep: "/incidents", fields: ["incident_code","title","business_unit","occurrence_date","severity","status","financial_loss"] },
  "Treatment Plans": { ep: "/treatments", fields: ["risk_id","treatment_option","action_owner","priority","target_completion_date","progress_percentage","status"] },
  "Compliance Obligations": { ep: "/obligations", fields: ["title","obligation_type","regulator","frequency","due_date","status"] },
  "Control Tests": { ep: "/control-tests", fields: ["risk_id","test_period","test_type","tester","test_result","deficiency","status"] },
  "KRIs": { ep: "/kris", fields: ["name","unit","current_value","threshold_amber","threshold_red","status","frequency"] },
  "Audit Trail": { ep: "/audit", fields: ["timestamp","user_name","user_role","action","object_type","object_id"] },
};

export default function ReportBuilder() {
  const [source, setSource] = useState("Risk Register");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(SOURCES["Risk Register"].fields);
  const [filter, setFilter] = useState("");

  useEffect(() => { api.get(SOURCES[source].ep).then(r=>{ setRows(r.data); setSelected(SOURCES[source].fields); }); }, [source]);

  const filtered = useMemo(() => filter ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase())) : rows, [rows, filter]);

  const exportCSV = () => {
    const head = selected.join(",");
    const body = filtered.map(r => selected.map(f => JSON.stringify(r[f] ?? "")).join(",")).join("\n");
    const blob = new Blob([head+"\n"+body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${source.replace(/\s/g,'_')}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Advanced Report Builder</h1><p className="text-sm text-slate-500 mt-1">{filtered.length} rows · {selected.length} fields</p></div>
        <Button onClick={exportCSV} className="bg-blue-700 hover:bg-blue-800"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Data Source</Label><Select value={source} onValueChange={setSource}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.keys(SOURCES).map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="md:col-span-2"><Label>Quick Filter</Label><Input placeholder="Search any field…" value={filter} onChange={e=>setFilter(e.target.value)} /></div>
        </div>
        <div>
          <Label className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Fields</Label>
          <div className="flex flex-wrap gap-2 mt-2">{SOURCES[source].fields.map(f => (
            <button key={f} onClick={()=>setSelected(selected.includes(f) ? selected.filter(x=>x!==f) : [...selected, f])}
              className={`px-2 py-1 rounded text-xs border ${selected.includes(f) ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-slate-200 text-slate-600"}`}>{f}</button>
          ))}</div>
        </div>
      </Card>
      <Card className="overflow-auto"><table className="w-full text-xs"><thead className="bg-slate-50 border-b"><tr>{selected.map(f=><th key={f} className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-slate-500">{f}</th>)}</tr></thead><tbody>
        {filtered.slice(0,200).map((r,i)=>(<tr key={i} className="border-b border-slate-100">{selected.map(f=><td key={f} className="py-1.5 px-2">{String(r[f]??"—").slice(0,60)}</td>)}</tr>))}
      </tbody></table></Card>
    </div>
  );
}
