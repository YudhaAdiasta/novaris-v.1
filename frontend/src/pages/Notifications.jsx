import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

export default function Notifications() {
  const [list, setList] = useState([]);
  const load = () => api.get("/notifications").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const markAll = async () => { await api.post("/notifications/read-all"); toast.success("Marked all read"); load(); };
  const markOne = async (id) => { await api.post(`/notifications/${id}/read`); load(); };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Notifications</h1><p className="text-sm text-slate-500 mt-1">{list.filter(n=>!n.read).length} unread of {list.length}</p></div>
        {list.some((n) => !n.read) && <Button variant="outline" onClick={markAll}><CheckCheck className="w-4 h-4 mr-2" />Mark all read</Button>}
      </div>
      <Card>
        <div className="divide-y divide-slate-100">
          {list.map((n) => (
            <div key={n.id} onClick={() => !n.read && markOne(n.id)} className={`p-4 cursor-pointer hover:bg-slate-50 ${!n.read ? "bg-blue-50/30" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${n.read ? "bg-slate-300" : "bg-blue-600"}`} />
                <div className="flex-1">
                  <div className={`text-sm ${n.read ? "text-slate-600" : "text-slate-900 font-medium"}`}>{n.message}</div>
                  <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()} · {n.object_type}</div>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">No notifications yet.</div>}
        </div>
      </Card>
    </div>
  );
}
