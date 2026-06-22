import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AuditTrail() {
  const [audit, setAudit] = useState([]);
  const [action, setAction] = useState("all");
  useEffect(() => { api.get("/audit").then((r) => setAudit(r.data)); }, []);
  const actions = useMemo(() => Array.from(new Set(audit.map((a) => a.action))), [audit]);
  const filtered = audit.filter((a) => action === "all" || a.action === action);

  const columns = [
    { key: "timestamp", header: "When", render: (a) => <span className="text-xs font-mono text-slate-500">{new Date(a.timestamp).toLocaleString()}</span> },
    { key: "user_name", header: "User" },
    { key: "user_role", header: "Role" },
    { key: "action", header: "Action", render: (a) => <span className="font-medium">{a.action}</span> },
    { key: "object_type", header: "Object" },
    { key: "remarks", header: "Remarks" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Audit Trail</h1><p className="text-sm text-slate-500 mt-1">{filtered.length} of {audit.length} events</p></div>
        <div className="w-64"><Select value={action} onValueChange={setAction}><SelectTrigger className="h-10 rounded-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Actions</SelectItem>{actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <DataTable columns={columns} rows={filtered} searchKeys={["user_name","action","object_type","user_role","remarks"]} rowKey={(a)=>a.id} emptyText="No audit events." />
    </div>
  );
}
