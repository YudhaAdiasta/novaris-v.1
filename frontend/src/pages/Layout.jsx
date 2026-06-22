import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/api";
import { ShieldCheck, LayoutDashboard, FileText, PlusCircle, ListChecks, ClipboardCheck, FileBarChart, History, Settings2, Users, Sliders, Target, LogOut, ChevronDown, Activity, AlertOctagon, Calendar, Bell, GitBranch } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin","risk_officer","risk_owner","approver","viewer"], end: true },
  { to: "/risks", label: "Risk Register", icon: FileText, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
  { to: "/risks/new", label: "Create Risk", icon: PlusCircle, roles: ["admin","risk_officer","risk_owner"] },
  { to: "/approvals", label: "Approval Tasks", icon: ClipboardCheck, roles: ["admin","risk_officer","approver"] },
  { to: "/treatments", label: "Treatment Plans", icon: ListChecks, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
  { to: "/kris", label: "KRIs", icon: Activity, roles: ["admin","risk_officer","risk_owner","viewer"] },
  { to: "/incidents", label: "Incidents", icon: AlertOctagon, roles: ["admin","risk_officer","risk_owner","viewer"] },
  { to: "/calendar", label: "Review Calendar", icon: Calendar, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
  { to: "/reports", label: "Reports", icon: FileBarChart, roles: ["admin","risk_officer","risk_owner","approver","viewer"] },
  { to: "/audit", label: "Audit Trail", icon: History, roles: ["admin","risk_officer","viewer"] },
];

const ADMIN_NAV = [
  { to: "/admin/taxonomy", label: "Risk Taxonomy", icon: FileText },
  { to: "/admin/matrix", label: "Scoring Matrix", icon: Sliders },
  { to: "/admin/appetite", label: "Risk Appetite", icon: Target },
  { to: "/admin/escalation", label: "Escalation Matrix", icon: GitBranch },
  { to: "/admin/users", label: "Users & Roles", icon: Users },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const items = NAV.filter((n) => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 border-r border-slate-200 bg-white h-screen sticky top-0 flex flex-col" data-testid="sidebar">
        <div className="h-14 border-b border-slate-200 flex items-center px-4 gap-2.5">
          <div className="w-8 h-8 rounded-md bg-blue-700 flex items-center justify-center text-white"><ShieldCheck className="w-4 h-4" /></div>
          <div>
            <div className="font-heading text-sm font-bold tracking-tight text-slate-900 leading-none">NOVARIS</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Risk Management</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g,'-')}`}
              className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              <n.icon className="w-4 h-4" /> {n.label}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <>
              <div className="pt-5 pb-2 px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Administration</div>
              {ADMIN_NAV.map((n) => (
                <NavLink key={n.to} to={n.to} data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g,'-')}`}
                  className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                  <n.icon className="w-4 h-4" /> {n.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 text-xs text-slate-500">v1.0 · Dana Pensiun Edition</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-center justify-between px-6">
          <div className="text-sm text-slate-500">Enterprise Risk Management</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid="user-menu" className="flex items-center gap-2.5 text-left hover:bg-slate-50 rounded-md px-2 py-1.5 transition">
                <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-semibold">{user?.name?.split(" ").map(p=>p[0]).slice(0,2).join("")}</div>
                <div>
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
        </header>
        <main className="flex-1 overflow-x-hidden p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
