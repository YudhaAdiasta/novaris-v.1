import React from "react";
import { cn } from "./utils";
import { RISK_LEVEL_STYLES, STATUS_STYLES, APPETITE_STYLES } from "./api";

export const RiskBadge = ({ level }) => (
  <span data-testid={`risk-level-${level?.toLowerCase()}`} className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", RISK_LEVEL_STYLES[level] || "bg-slate-100 text-slate-700")}>{level || "—"}</span>
);

export const StatusBadge = ({ status }) => (
  <span data-testid={`status-${status?.toLowerCase().replace(/\s+/g, '-')}`} className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap", STATUS_STYLES[status] || "bg-slate-100 text-slate-700")}>{status || "—"}</span>
);

export const AppetiteBadge = ({ status }) => (
  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", APPETITE_STYLES[status] || "bg-slate-100 text-slate-700")}>{status || "—"}</span>
);
