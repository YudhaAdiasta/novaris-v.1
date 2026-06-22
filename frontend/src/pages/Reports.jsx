import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { RiskBadge, AppetiteBadge, StatusBadge } from "@/lib/badges";

export default function Reports() {
  const [risks, setRisks] = useState([]);
  const [cats, setCats] = useState([]);
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get("/risks").then((r)=>setRisks(r.data)); api.get("/categories").then((r)=>setCats(r.data)); api.get("/users").then((r)=>setUsers(r.data)).catch(()=>{}); }, []);
  const catMap = Object.fromEntries(cats.map((c)=>[c.id,c.name]));
  const userMap = Object.fromEntries(users.map((u)=>[u.id,u.name]));

  const exportCSV = async () => {
    const t = localStorage.getItem("novaris_token");
    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reports/risk-register.csv`, { headers: { Authorization: `Bearer ${t}` } });
    const blob = await res.blob(); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "risk_register.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Risk Register Report</p>
        </div>
        <Button onClick={exportCSV} className="bg-blue-700 hover:bg-blue-800" data-testid="export-report-btn"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="text-left py-2 px-2">Risk ID</th><th className="text-left py-2 px-2">Title</th><th className="text-left py-2 px-2">Category</th><th className="text-left py-2 px-2">Unit</th><th className="text-left py-2 px-2">Owner</th>
              <th className="text-center py-2 px-2">IL</th><th className="text-center py-2 px-2">II</th><th className="text-center py-2 px-2">IS</th><th className="text-left py-2 px-2">Inh Lvl</th>
              <th className="text-center py-2 px-2">RL</th><th className="text-center py-2 px-2">RI</th><th className="text-center py-2 px-2">RS</th><th className="text-left py-2 px-2">Res Lvl</th>
              <th className="text-left py-2 px-2">App Lvl</th><th className="text-left py-2 px-2">App Status</th><th className="text-left py-2 px-2">Status</th>
            </tr></thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 px-2 font-mono">{r.risk_id}</td><td className="py-2 px-2 max-w-xs truncate">{r.title}</td>
                  <td className="py-2 px-2">{catMap[r.category_id]}</td><td className="py-2 px-2">{r.business_unit}</td><td className="py-2 px-2">{userMap[r.owner_id] || "—"}</td>
                  <td className="py-2 px-2 text-center">{r.inherent_likelihood}</td><td className="py-2 px-2 text-center">{r.inherent_impact}</td><td className="py-2 px-2 text-center font-mono">{r.inherent_score}</td><td className="py-2 px-2"><RiskBadge level={r.inherent_level} /></td>
                  <td className="py-2 px-2 text-center">{r.residual_likelihood}</td><td className="py-2 px-2 text-center">{r.residual_impact}</td><td className="py-2 px-2 text-center font-mono">{r.residual_score}</td><td className="py-2 px-2"><RiskBadge level={r.residual_level} /></td>
                  <td className="py-2 px-2"><RiskBadge level={r.appetite_level} /></td><td className="py-2 px-2"><AppetiteBadge status={r.appetite_status} /></td><td className="py-2 px-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
