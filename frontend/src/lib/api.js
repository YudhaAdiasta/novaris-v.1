import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TOKEN_KEY = "novaris_token";

export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({ baseURL: API, withCredentials: false });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const RISK_LEVEL_STYLES = {
  Low: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border border-amber-200",
  High: "bg-orange-50 text-orange-700 border border-orange-200",
  Critical: "bg-rose-50 text-rose-700 border border-rose-200",
};

export const RISK_LEVEL_SOLID = {
  Low: "#10B981",
  Medium: "#F59E0B",
  High: "#F97316",
  Critical: "#E11D48",
};

export const STATUS_STYLES = {
  Draft: "bg-slate-100 text-slate-700 border border-slate-200",
  Submitted: "bg-blue-50 text-blue-700 border border-blue-200",
  "Under Review": "bg-amber-50 text-amber-700 border border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Returned for Revision": "bg-orange-50 text-orange-700 border border-orange-200",
  "Treatment Required": "bg-rose-50 text-rose-700 border border-rose-200",
  "Treatment in Progress": "bg-purple-50 text-purple-700 border border-purple-200",
  "Pending Validation": "bg-amber-50 text-amber-700 border border-amber-200",
  Closed: "bg-slate-200 text-slate-700 border border-slate-300",
  "In Progress": "bg-purple-50 text-purple-700 border border-purple-200",
  Completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border border-amber-200",
  Returned: "bg-orange-50 text-orange-700 border border-orange-200",
  Rejected: "bg-rose-50 text-rose-700 border border-rose-200",
};

export const APPETITE_STYLES = {
  "Within Appetite": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Exceeds Appetite": "bg-rose-50 text-rose-700 border border-rose-200",
};

export const ROLE_LABELS = {
  admin: "Admin",
  risk_officer: "Risk Officer",
  risk_owner: "Risk Owner",
  approver: "Approver",
  viewer: "Viewer",
};

export const calcScore = (l, i) => Number(l) * Number(i);
export const calcLevel = (s) => s <= 4 ? "Low" : s <= 9 ? "Medium" : s <= 15 ? "High" : "Critical";

// Compact number formatter for chart labels: 184.2B, 850M, 25K
export const formatCompact = (n) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  const v = Number(n);
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(1).replace(/\.0$/, "") + "T";
  if (abs >= 1e9)  return (v / 1e9).toFixed(1).replace(/\.0$/, "")  + "B";
  if (abs >= 1e6)  return (v / 1e6).toFixed(1).replace(/\.0$/, "")  + "M";
  if (abs >= 1e3)  return (v / 1e3).toFixed(1).replace(/\.0$/, "")  + "K";
  return String(v);
};

// Comma-separated for table cells / tooltips
export const formatNumber = (n) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  return Number(n).toLocaleString();
};
