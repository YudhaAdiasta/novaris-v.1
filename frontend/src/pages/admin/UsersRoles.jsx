import React, { useEffect, useState } from "react";
import { api, ROLE_LABELS } from "@/lib/api";
import { Card } from "@/components/ui/card";

export default function UsersRoles() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get("/users").then((r) => setList(r.data)); }, []);
  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Users &amp; Roles</h1><p className="text-sm text-slate-500 mt-1">{list.length} users</p></div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="text-left py-2.5 px-3">Name</th><th className="text-left py-2.5 px-3">Email</th><th className="text-left py-2.5 px-3">Role</th><th className="text-left py-2.5 px-3">Department</th><th className="text-left py-2.5 px-3">Status</th></tr></thead><tbody>
          {list.map((u) => (
            <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2.5 px-3 font-medium">{u.name}</td><td className="py-2.5 px-3 font-mono text-xs">{u.email}</td>
              <td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs bg-teal-50 text-teal-700 border border-teal-200">{ROLE_LABELS[u.role]}</span></td>
              <td className="py-2.5 px-3 text-slate-600">{u.department}</td><td className="py-2.5 px-3"><span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">{u.status}</span></td>
            </tr>
          ))}
        </tbody></table>
      </Card>
    </div>
  );
}
