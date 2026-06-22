import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/lib/badges";
import { Link } from "react-router-dom";

export default function ApprovalTasks() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { api.get("/approvals").then((r) => setTasks(r.data)); }, []);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Approval Tasks</h1>
        <p className="text-sm text-slate-500 mt-1">{tasks.length} task(s)</p>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm" data-testid="approval-tasks-table">
          <thead className="bg-slate-50 border-b border-slate-200"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2.5 px-3">Task</th><th className="text-left py-2.5 px-3">Type</th><th className="text-left py-2.5 px-3">Submitted</th><th className="text-left py-2.5 px-3">Status</th><th className="text-left py-2.5 px-3">Action</th></tr></thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 px-3 font-medium">{t.task_name}</td>
                <td className="py-2.5 px-3">{t.object_type}</td>
                <td className="py-2.5 px-3 text-xs text-slate-500">{new Date(t.submitted_date).toLocaleString()}</td>
                <td className="py-2.5 px-3"><StatusBadge status={t.status} /></td>
                <td className="py-2.5 px-3">{t.object_type === "Risk" ? <Link to={`/risks/${t.object_id}`} className="text-teal-700 hover:underline text-sm font-medium">Open</Link> : <Link to="/treatments" className="text-teal-700 hover:underline text-sm font-medium">Open</Link>}</td>
              </tr>
            ))}
            {tasks.length === 0 && <tr><td colSpan="5" className="py-10 text-center text-slate-400">No approval tasks.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
