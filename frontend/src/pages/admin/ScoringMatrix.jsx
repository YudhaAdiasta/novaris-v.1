import React, { useEffect, useState } from "react";
import { api, RISK_LEVEL_SOLID, calcScore, calcLevel } from "@/lib/api";
import { Card } from "@/components/ui/card";

export default function ScoringMatrix() {
  const [m, setM] = useState(null);
  useEffect(() => { api.get("/matrix").then((r) => setM(r.data)); }, []);
  if (!m?.likelihood) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Scoring Matrix</h1>
        <p className="text-sm text-slate-500 mt-1">Score = Likelihood × Impact. Level mapping defines risk levels 1–25.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Likelihood Criteria</h3>
          <table className="w-full text-sm"><thead><tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200"><th className="text-left py-2">Score</th><th className="text-left py-2">Label</th><th className="text-left py-2">Description</th></tr></thead><tbody>
            {m.likelihood.map((l) => <tr key={l.score} className="border-b border-slate-100"><td className="py-2 font-mono">{l.score}</td><td className="py-2 font-medium">{l.label}</td><td className="py-2 text-slate-600">{l.description}</td></tr>)}
          </tbody></table>
        </Card>
        <Card className="p-5">
          <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Impact Criteria</h3>
          <table className="w-full text-sm"><thead><tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200"><th className="text-left py-2">Score</th><th className="text-left py-2">Label</th><th className="text-left py-2">Description</th></tr></thead><tbody>
            {m.impact.map((l) => <tr key={l.score} className="border-b border-slate-100"><td className="py-2 font-mono">{l.score}</td><td className="py-2 font-medium">{l.label}</td><td className="py-2 text-slate-600">{l.description}</td></tr>)}
          </tbody></table>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">Risk Level Mapping</h3>
        <div className="grid grid-cols-4 gap-3">
          {m.levels.map((lv) => (
            <div key={lv.label} className="rounded-lg p-4 border" style={{ background: RISK_LEVEL_SOLID[lv.label] + "20", borderColor: RISK_LEVEL_SOLID[lv.label] + "60" }}>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-600">{lv.label}</div>
              <div className="font-heading text-2xl font-bold mt-1" style={{ color: RISK_LEVEL_SOLID[lv.label] }}>{lv.min} – {lv.max}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-heading text-base font-semibold text-slate-800 mb-4">5×5 Risk Heatmap</h3>
        <div className="flex">
          <div className="flex flex-col justify-around mr-3">
            <div className="-rotate-90 text-xs font-semibold tracking-wider text-slate-500 uppercase whitespace-nowrap">Likelihood →</div>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-6 gap-1.5">
              <div></div>
              {[1,2,3,4,5].map((i) => <div key={i} className="text-center text-xs font-semibold text-slate-500">{i}</div>)}
              {[5,4,3,2,1].map((l) => (
                <React.Fragment key={l}>
                  <div className="text-right pr-2 text-xs font-semibold text-slate-500 flex items-center justify-end">{l}</div>
                  {[1,2,3,4,5].map((i) => {
                    const s = calcScore(l, i); const lv = calcLevel(s);
                    return (
                      <div key={`${l}-${i}`} className="aspect-square rounded flex flex-col items-center justify-center text-white font-semibold text-sm shadow-sm" style={{ background: RISK_LEVEL_SOLID[lv] }}>
                        <span className="text-base">{s}</span>
                        <span className="text-[9px] opacity-90">{lv}</span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <div className="text-center text-xs font-semibold tracking-wider text-slate-500 uppercase mt-3">Impact →</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
