import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import Layout from "@/pages/Layout";
import Dashboard from "@/pages/Dashboard";
import RiskRegister from "@/pages/RiskRegister";
import RiskForm from "@/pages/RiskForm";
import RiskDetail from "@/pages/RiskDetail";
import TreatmentPlans from "@/pages/TreatmentPlans";
import ApprovalTasks from "@/pages/ApprovalTasks";
import Reports from "@/pages/Reports";
import AuditTrail from "@/pages/AuditTrail";
import KRI from "@/pages/KRI";
import Committees from "@/pages/Committees";
import Obligations from "@/pages/Obligations";
import ControlTesting from "@/pages/ControlTesting";
import Acceptances from "@/pages/Acceptances";
import ReportBuilder from "@/pages/ReportBuilder";
import Incidents from "@/pages/Incidents";
import ReviewCalendar from "@/pages/ReviewCalendar";
import Notifications from "@/pages/Notifications";
import EscalationMatrix from "@/pages/admin/EscalationMatrix";
import RiskTaxonomy from "@/pages/admin/RiskTaxonomy";
import ScoringMatrix from "@/pages/admin/ScoringMatrix";
import RiskAppetite from "@/pages/admin/RiskAppetite";
import UsersRoles from "@/pages/admin/UsersRoles";

function Private({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Layout /></Private>}>
        <Route index element={<Dashboard />} />
        <Route path="risks" element={<RiskRegister />} />
        <Route path="risks/new" element={<Private roles={["admin","risk_owner","risk_officer"]}><RiskForm /></Private>} />
        <Route path="risks/:id" element={<RiskDetail />} />
        <Route path="risks/:id/edit" element={<Private roles={["admin","risk_owner","risk_officer"]}><RiskForm /></Private>} />
        <Route path="treatments" element={<TreatmentPlans />} />
        <Route path="kris" element={<KRI />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="calendar" element={<ReviewCalendar />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="committees" element={<Committees />} />
        <Route path="obligations" element={<Obligations />} />
        <Route path="control-testing" element={<ControlTesting />} />
        <Route path="acceptances" element={<Acceptances />} />
        <Route path="report-builder" element={<ReportBuilder />} />
        <Route path="admin/escalation" element={<Private roles={["admin"]}><EscalationMatrix /></Private>} />
        <Route path="approvals" element={<Private roles={["admin","risk_officer","approver"]}><ApprovalTasks /></Private>} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<AuditTrail />} />
        <Route path="admin/taxonomy" element={<Private roles={["admin"]}><RiskTaxonomy /></Private>} />
        <Route path="admin/matrix" element={<Private roles={["admin"]}><ScoringMatrix /></Private>} />
        <Route path="admin/appetite" element={<Private roles={["admin"]}><RiskAppetite /></Private>} />
        <Route path="admin/users" element={<Private roles={["admin"]}><UsersRoles /></Private>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
