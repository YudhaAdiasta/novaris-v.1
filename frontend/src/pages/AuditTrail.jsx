import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AuditTrail() {
  const [audit, setAudit] = useState([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  useEffect(() => { api.get("/audit").then((r) => setAudit(r.data)); }, []);

  const actions = useMemo(() => Array.from(new Set(audit.map((a) => a.action))), [audit]);
  const filtered = audit.filter((a) => (action === "all" || a.action === action) && (`${a.user_name} ${a.action} ${a.object_type}`.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Audit Trail</h1>
        <p className="text-sm text-slate-500 mt-1">{filtered.length} of {audit.length} events</p>
      </div>
      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10" data-testid="audit-search" />
        <Select value={action} onValueChange={setAction}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Actions</SelectItem>{actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-sm" data-testid="audit-table">
          <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2.5 px-3">When</th><th className="text-left py-2.5 px-3">User</th><th className="text-left py-2.5 px-3">Role</th><th className="text-left py-2.5 px-3">Action</th><th className="text-left py-2.5 px-3">Object</th><th className="text-left py-2.5 px-3">Remarks</th></tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 text-xs font-mono text-slate-500">{new Date(a.timestamp).toLocaleString()}</td>
                <td className="py-2 px-3">{a.user_name || "—"}</td><td className="py-2 px-3 text-slate-600">{a.user_role}</td>
                <td className="py-2 px-3 font-medium">{a.action}</td><td className="py-2 px-3 text-slate-600">{a.object_type}</td><td className="py-2 px-3 text-slate-600">{a.remarks || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
