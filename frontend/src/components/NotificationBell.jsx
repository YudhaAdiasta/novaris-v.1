import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export default function NotificationBell() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    api.get("/notifications").then((r) => setList(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(t);
  }, [load]);

  const unread = list.filter((n) => !n.read).length;

  const markAll = async () => {
    try { await api.post("/notifications/read-all"); toast.success("Marked all read"); load(); } catch { /* ignore */ }
  };
  const markOne = async (id) => {
    try { await api.post(`/notifications/${id}/read`); load(); } catch { /* ignore */ }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button data-testid="notification-bell" className="relative w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-slate-100 transition" aria-label="Notifications">
          <Bell className="w-4 h-4 text-slate-600" />
          {unread > 0 && (
            <span data-testid="notification-dot" className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-slate-200 flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle className="font-heading">Notifications</SheetTitle>
            <p className="text-xs text-slate-500 mt-0.5">{unread} unread of {list.length}</p>
          </div>
          {unread > 0 && (
            <Button size="sm" variant="outline" onClick={markAll} data-testid="notification-mark-all"><CheckCheck className="w-3 h-3 mr-1" />Mark all read</Button>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {list.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No notifications yet.</div>
          ) : list.map((n) => (
            <button key={n.id} onClick={() => !n.read && markOne(n.id)}
              className={`w-full text-left p-4 hover:bg-slate-50 transition ${!n.read ? "bg-teal-50/40" : ""}`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.read ? "bg-slate-300" : "bg-teal-600"}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${n.read ? "text-slate-600" : "text-slate-900 font-medium"}`}>{n.message}</div>
                  <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()} · {n.object_type}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
