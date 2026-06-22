import React, { useEffect, useState } from "react";
import { api, ROLE_LABELS } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import DataTable from "@/components/DataTable";

export default function UsersRoles() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get("/users").then((r) => setList(r.data)); }, []);

  const columns = [
    { key: "name", header: "Name", render: (u) => <span className="font-medium text-slate-800">{u.name}</span> },
    { key: "email", header: "Email", render: (u) => <span className="font-mono text-xs">{u.email}</span> },
    { key: "role", header: "Role", render: (u) => <span className="px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 border border-teal-200">{ROLE_LABELS[u.role]}</span> },
    { key: "department", header: "Department", render: (u) => <span className="text-slate-600">{u.department}</span> },
    { key: "status", header: "Active", render: (u) => <div className="flex items-center gap-2"><Switch checked={u.status === "Active"} disabled /><span className={`text-xs ${u.status==="Active"?"text-teal-700":"text-slate-400"}`}>{u.status}</span></div> },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Users &amp; Roles</h1><p className="text-sm text-slate-500 mt-1">{list.length} users</p></div>
      <DataTable columns={columns} rows={list} searchKeys={["name","email","role","department"]} rowKey={(u)=>u.id} emptyText="No users." />
    </div>
  );
}
