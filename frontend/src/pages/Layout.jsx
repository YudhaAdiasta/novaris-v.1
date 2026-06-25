import React from "react";
import { NavLink, Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/api";
import { ShieldCheck, LayoutDashboard, FileText, PlusCircle, ListChecks, ClipboardCheck, FileBarChart, History, Users, Sliders, Target, LogOut, ChevronDown, ChevronRight, Activity, AlertOctagon, Calendar, Bell, GitBranch, Briefcase, Scale, ClipboardList, FileCheck, Wrench, Home, Building2, ArrowLeftRight, Database, Upload, BarChart3 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/NotificationBell";

const NAV_GROUPS = [
  {
    section: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin","risk_officer","risk_owner","approver","viewer"], end: true },
    ],
  },
  {
    section: "Risk Lifecycle",
    items: [
      { to: "/risks", label: "Risk Register", icon: FileText, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
      { to: "/approvals", label: "Approval Tasks", icon: ClipboardCheck, roles: ["admin","risk_officer","approver"] },
      { to: "/treatments", label: "Treatment Plans", icon: ListChecks, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
      { to: "/acceptances", label: "Risk Acceptance", icon: ClipboardList, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
    ],
  },
  {
    section: "Monitoring & Control",
    items: [
      { to: "/kris", label: "KRIs", icon: Activity, roles: ["admin","risk_officer","risk_owner","viewer"] },
      { to: "/incidents", label: "Incidents", icon: AlertOctagon, roles: ["admin","risk_officer","risk_owner","viewer"] },
      { to: "/control-testing", label: "Control Testing", icon: FileCheck, roles: ["admin","risk_officer","risk_owner","viewer"] },
      { to: "/obligations", label: "Compliance", icon: Scale, roles: ["admin","risk_officer","risk_owner","viewer"] },
      { to: "/calendar", label: "Review Calendar", icon: Calendar, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
    ],
  },
  {
    section: "Data Feeds",
    items: [
      { to: "/feeds", label: "Data Feeds", icon: Database, roles: ["admin","risk_officer","risk_owner","viewer"] },
      { to: "/feeds/dashboards", label: "Feed Dashboards", icon: BarChart3, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
      { to: "/feeds/breaches", label: "Feed Breaches", icon: AlertOctagon, roles: ["admin","risk_officer","risk_owner","viewer"] },
    ],
  },
  {
    section: "Governance & Reporting",
    items: [
      { to: "/committees", label: "Committees", icon: Briefcase, roles: ["admin","risk_officer","approver","viewer"] },
      { to: "/report-builder", label: "Report Builder", icon: Wrench, roles: ["admin","risk_officer","approver","viewer"] },
      { to: "/reports", label: "Reports", icon: FileBarChart, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
      { to: "/audit", label: "Audit Trail", icon: History, roles: ["admin","risk_officer","viewer"] },
    ],
  },
];

const ADMIN_NAV = [
  { to: "/admin/taxonomy", label: "Risk Taxonomy", icon: FileText },
  { to: "/admin/matrix", label: "Scoring Matrix", icon: Sliders },
  { to: "/admin/appetite", label: "Risk Appetite", icon: Target },
  { to: "/admin/escalation", label: "Escalation Matrix", icon: GitBranch },
  { to: "/admin/feed-mapping", label: "Feed Mapping", icon: Database },
  { to: "/admin/users", label: "Users & Roles", icon: Users },
];

const navLinkClass = ({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition ${isActive ? "bg-teal-500/15 text-teal-300 border-l-2 border-teal-400" : "text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent"}`;
const SectionLabel = ({ children }) => <div className="pt-4 pb-1.5 px-3 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{children}</div>;

const ROUTE_LABEL = {
  "": "Dashboard", risks: "Risk Register", new: "Create", edit: "Edit",
  approvals: "Approval Tasks", treatments: "Treatment Plans", kris: "KRIs",
  incidents: "Incidents", calendar: "Review Calendar", notifications: "Notifications",
  committees: "Committees", obligations: "Compliance", "control-testing": "Control Testing",
  acceptances: "Risk Acceptance", "report-builder": "Report Builder", reports: "Reports",
  audit: "Audit Trail", admin: "Administration", taxonomy: "Risk Taxonomy",
  matrix: "Scoring Matrix", appetite: "Risk Appetite", escalation: "Escalation Matrix", users: "Users & Roles",
};

function Breadcrumbs() {
  const loc = useLocation();
  const parts = loc.pathname.split("/").filter(Boolean);
  return (
    <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      <Link to="/" className="text-slate-400 hover:text-teal-600 transition flex items-center"><Home className="w-3.5 h-3.5" /></Link>
      {parts.map((p, i) => {
        const last = i === parts.length - 1;
        const path = "/" + parts.slice(0, i + 1).join("/");
        const label = ROUTE_LABEL[p] || (p.length > 8 ? p.slice(0, 8) + "…" : p.charAt(0).toUpperCase() + p.slice(1));
        return (
          <React.Fragment key={path}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            {last ? <span className="font-medium text-teal-700">{label}</span>
                  : <Link to={path} className="text-slate-500 hover:text-teal-600 transition">{label}</Link>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const groups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((n) => n.roles.includes(user?.role)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 h-screen sticky top-0 flex flex-col bg-slate-900 text-slate-200" data-testid="sidebar">
        <div className="h-16 border-b border-slate-800 flex items-center px-5 gap-2.5">
          <div className="w-7 h-7 rounded-md bg-teal-500 flex items-center justify-center text-white"><ShieldCheck className="w-4 h-4" /></div>
          <div>
            <div className="font-heading text-[11px] font-semibold tracking-wider text-slate-400 uppercase leading-none">Risk Management</div>
            <div className="font-heading text-sm font-bold tracking-tight text-white leading-tight mt-0.5">Information System</div>
          </div>
        </div>

        <div className="px-3 pt-4">
          <div className="rounded-lg bg-slate-800/70 border border-slate-700/60 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-slate-700 flex items-center justify-center"><Building2 className="w-4 h-4 text-teal-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white leading-none truncate">PT. NOVARIS</div>
                <div className="text-[11px] text-slate-400 mt-1">Dana Pensiun</div>
              </div>
            </div>
            <button data-testid="company-switch" className="w-full mt-2 flex items-center justify-between text-[11px] font-medium text-slate-300 hover:text-teal-400 transition bg-slate-900/50 border border-slate-700/60 rounded-md px-2 py-1.5">
              <span>Switch company</span><ArrowLeftRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {groups.map((g) => (
            <div key={g.section}>
              <SectionLabel>{g.section}</SectionLabel>
              {g.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g,'-')}`} className={navLinkClass}>
                  <n.icon className="w-4 h-4" /> {n.label}
                </NavLink>
              ))}
            </div>
          ))}
          {user?.role === "admin" && (
            <div>
              <SectionLabel>Administration</SectionLabel>
              {ADMIN_NAV.map((n) => (
                <NavLink key={n.to} to={n.to} data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g,'-')}`} className={navLinkClass}>
                  <n.icon className="w-4 h-4" /> {n.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="text-[11px] text-slate-500">v1.3 · Phase 3 · Dana Pensiun Edition</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-center justify-between px-6 lg:px-8">
          <Breadcrumbs />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="user-menu" className="flex items-center gap-2.5 text-left hover:bg-slate-50 rounded-md px-2 py-1.5 transition">
                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-semibold">{user?.name?.split(" ").map(p=>p[0]).slice(0,2).join("")}</div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-slate-800 leading-none">{user?.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{ROLE_LABELS[user?.role]}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="logout-btn" onClick={async () => { await logout(); nav("/login"); }}>
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-6 lg:p-8 bg-slate-50/60"><Outlet /></main>
      </div>
    </div>
  );
}
