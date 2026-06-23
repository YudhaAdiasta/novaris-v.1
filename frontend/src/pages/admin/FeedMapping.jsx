import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Info } from "lucide-react";
import { toast } from "sonner";

/**
 * Feed Mapping admin page.
 * For each feed group, admins can define a {source_column -> rms_field} mapping
 * that is applied at upload time so files with non-standard headers can still
 * be ingested without changing the CSV. Active mapping is per-group.
 */
export default function FeedMapping() {
  const [groups, setGroups] = useState([]);
  const [active, setActive] = useState("appetite");
  const [mappings, setMappings] = useState([]);
  const [pairs, setPairs] = useState([]); // [{source, target}, ...]
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/feeds/groups").then((r) => setGroups(r.data));
    api.get("/feeds/mappings").then((r) => setMappings(r.data));
  }, []);

  const groupCfg = useMemo(() => groups.find((g) => g.key === active), [groups, active]);

  // When active group changes, populate pairs from saved mapping if any
  useEffect(() => {
    if (!groupCfg) return;
    const saved = mappings.find((m) => m.group === active);
    if (saved && Object.keys(saved.mapping || {}).length) {
      setPairs(Object.entries(saved.mapping).map(([s, t]) => ({ source: s, target: t })));
      setNotes(saved.notes || "");
    } else {
      // Default: identity mapping for all fields
      setPairs(groupCfg.fields.map((f) => ({ source: f, target: f })));
      setNotes("");
    }
    setLoaded(true);
  }, [active, groupCfg, mappings]);

  const updatePair = (i, k, v) => setPairs(pairs.map((p, j) => j === i ? { ...p, [k]: v } : p));
  const addPair = () => setPairs([...pairs, { source: "", target: groupCfg?.fields?.[0] || "" }]);
  const removePair = (i) => setPairs(pairs.filter((_, j) => j !== i));

  const save = async () => {
    const mapping = Object.fromEntries(pairs.filter(p => p.source && p.target).map(p => [p.source, p.target]));
    try {
      await api.put(`/feeds/mappings/${active}`, { group: active, mapping, notes });
      toast.success("Mapping saved");
      const m = await api.get("/feeds/mappings"); setMappings(m.data);
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const clearMapping = async () => {
    try { await api.delete(`/feeds/mappings/${active}`); toast.success("Mapping cleared"); const m = await api.get("/feeds/mappings"); setMappings(m.data); setPairs(groupCfg?.fields.map(f => ({ source: f, target: f })) || []); setNotes(""); }
    catch { toast.error("Failed"); }
  };

  if (!groupCfg) return <div className="text-slate-500">Loading…</div>;

  const hasMapping = !!mappings.find((m) => m.group === active);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Feed Mapping Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">Remap incoming CSV columns to RMS fields per feed group. Useful when source files use non-standard headers.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasMapping && <Button variant="outline" onClick={clearMapping} className="text-rose-700 hover:bg-rose-50"><Trash2 className="w-4 h-4 mr-1" />Clear</Button>}
          <Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="w-4 h-4 mr-1" />Save Mapping</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Feed Group</Label>
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{groups.map((g) => <SelectItem key={g.key} value={g.key}>{g.label}{mappings.find(m=>m.group===g.key) ? " ·  mapped" : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Source: Bloomberg export Q1 2026" />
        </div>
      </div>

      <Card className="p-3 bg-teal-50/50 border-teal-200 text-xs text-slate-700 flex items-start gap-2">
        <Info className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-semibold">{groupCfg.fields.length} RMS fields</span> for this group. Required: <span className="font-mono">{groupCfg.required.join(", ")}</span>.
          Map each <em>source column header</em> on the left to the <em>RMS field</em> on the right. Unmapped columns are kept as-is.
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-xs uppercase tracking-wider text-slate-500">
              <th className="text-left py-2.5 px-3 w-1/2">Source Column (CSV)</th>
              <th className="text-left py-2.5 px-3 w-1/2">RMS Field</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((p, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 px-3"><Input value={p.source} onChange={(e) => updatePair(i, "source", e.target.value)} placeholder="e.g. RiskType" /></td>
                <td className="py-2 px-3">
                  <Select value={p.target} onValueChange={(v) => updatePair(i, "target", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select RMS field" /></SelectTrigger>
                    <SelectContent>{groupCfg.fields.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="py-2 px-3 text-right"><button onClick={() => removePair(i)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            <tr><td colSpan="3" className="py-3 px-3"><Button size="sm" variant="outline" onClick={addPair}><Plus className="w-4 h-4 mr-1" />Add Mapping Row</Button></td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
