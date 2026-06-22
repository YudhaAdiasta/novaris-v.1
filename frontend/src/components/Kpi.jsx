import React from "react";
import { Card } from "@/components/ui/card";

export const Kpi = ({ icon: Icon, label, value, tone }) => (
  <Card className="p-5 bg-white border-slate-200">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{label}</div>
        <div className="font-heading text-3xl font-bold text-slate-900 mt-2">{value ?? "—"}</div>
      </div>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center ${tone}`}><Icon className="w-4 h-4" /></div>
    </div>
  </Card>
);
