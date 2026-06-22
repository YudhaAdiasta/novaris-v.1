import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function ReviewCalendar() {
  const [events, setEvents] = useState([]);
  const [cursor, setCursor] = useState(new Date());
  useEffect(() => { api.get("/calendar").then((r) => setEvents(r.data)); }, []);

  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const first = new Date(year, month, 1); const last = new Date(year, month+1, 0);
  const startPad = first.getDay();
  const days = Array.from({length: startPad}, () => null).concat(Array.from({length: last.getDate()}, (_, i) => new Date(year, month, i+1)));
  const eventsByDate = useMemo(() => events.reduce((acc, e) => { (acc[e.date] = acc[e.date] || []).push(e); return acc; }, {}), [events]);

  const fmt = (d) => d.toISOString().slice(0,10);
  const monthLabel = cursor.toLocaleString("en", { month:"long", year:"numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Review Calendar</h1><p className="text-sm text-slate-500 mt-1">{events.length} upcoming items</p></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month-1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="font-heading text-base font-semibold w-44 text-center">{monthLabel}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month+1, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      <Card className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">{DOW.map((d) => <div key={d} className="text-xs font-semibold tracking-wider text-slate-500 uppercase text-center py-2">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = fmt(d); const evs = eventsByDate[ds] || [];
            const today = new Date().toISOString().slice(0,10) === ds;
            return (
              <div key={i} className={`min-h-[90px] border rounded-md p-2 ${today ? "border-blue-400 bg-blue-50/30" : "border-slate-200 bg-white"}`}>
                <div className={`text-xs font-semibold ${today ? "text-blue-700" : "text-slate-700"}`}>{d.getDate()}</div>
                <div className="mt-1 space-y-1">
                  {evs.slice(0,3).map((e) => (
                    <Link key={e.id} to={`/risks/${e.ref_id}`} className={`block text-[10px] px-1.5 py-0.5 rounded truncate ${e.type==="Risk Review" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"} hover:underline`}>{e.title}</Link>
                  ))}
                  {evs.length > 3 && <div className="text-[10px] text-slate-400">+{evs.length-3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-heading text-base font-semibold text-slate-800 mb-3">Upcoming List</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200"><th className="text-left py-2 px-3">Date</th><th className="text-left py-2 px-3">Type</th><th className="text-left py-2 px-3">Item</th><th></th></tr></thead>
          <tbody>{events.slice(0,30).map((e) => (
            <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-2 px-3 font-mono text-xs">{e.date}</td>
              <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs ${e.type==="Risk Review" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>{e.type}</span></td>
              <td className="py-2 px-3">{e.title}</td>
              <td className="py-2 px-3"><Link to={`/risks/${e.ref_id}`} className="text-blue-700 hover:underline text-xs">Open</Link></td>
            </tr>
          ))}</tbody>
        </table>
      </Card>
    </div>
  );
}
