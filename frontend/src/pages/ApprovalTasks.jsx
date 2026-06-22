import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate, Link } from "react-router-dom";
import { StatusBadge } from "@/lib/badges";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";
import { Eye } from "lucide-react";

export default function ApprovalTasks() {
  const nav = useNavigate();
  const [tasks, setTasks] = useState([]);
  useEffect(() => { api.get("/approvals").then((r) => setTasks(r.data)); }, []);

  const columns = [
    { key: "task_name", header: "Task", render: (t) => <span className="font-medium text-slate-800">{t.task_name}</span> },
    { key: "object_type", header: "Type", render: (t) => <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{t.object_type}</span> },
    { key: "submitted_date", header: "Submitted", render: (t) => <span className="text-xs text-slate-500">{new Date(t.submitted_date).toLocaleString()}</span> },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Approval Tasks</h1><p className="text-sm text-slate-500 mt-1">{tasks.length} task(s)</p></div>
      <DataTable columns={columns} rows={tasks} searchKeys={["task_name","object_type","status"]} rowKey={(t)=>t.id} emptyText="No approval tasks."
        actions={(t) => (<RowActions><IconAction icon={Eye} label="Open" tone="primary" onClick={() => nav(t.object_type === "Risk" ? `/risks/${t.object_id}` : "/treatments")} /></RowActions>)}
      />
    </div>
  );
}
