import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEMO = [
  { role: "Admin", email: "admin@demo.com", password: "Admin@123" },
  { role: "Risk Officer", email: "riskofficer@demo.com", password: "Officer@123" },
  { role: "Risk Owner", email: "riskowner@demo.com", password: "Owner@123" },
  { role: "Approver", email: "approver@demo.com", password: "Approver@123" },
  { role: "Viewer / Auditor", email: "auditor@demo.com", password: "Viewer@123" },
];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("Admin@123");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await login(email, password); nav("/"); }
    catch (err) { toast.error(err?.response?.data?.detail || "Login failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
            <div className="font-heading text-xl font-bold tracking-tight">NOVARIS</div>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight">Enterprise risk management built for pension institutions.</h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-md">From taxonomy and appetite to treatment and audit — orchestrate the full risk lifecycle with confidence.</p>
          <div className="flex gap-6 text-sm text-slate-400 pt-4 border-t border-slate-800">
            <div><div className="text-2xl font-heading font-bold text-white">5x5</div>Risk Matrix</div>
            <div><div className="text-2xl font-heading font-bold text-white">8</div>Risk Categories</div>
            <div><div className="text-2xl font-heading font-bold text-white">100%</div>Audit Coverage</div>
          </div>
        </div>
        <div className="relative z-10 text-xs text-slate-500">© 2026 NOVARIS · Dana Pensiun Edition</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white"><ShieldCheck className="w-4 h-4" /></div>
            <span className="font-heading text-lg font-bold">NOVARIS</span>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Sign in to your workspace</h2>
            <p className="text-sm text-slate-500 mt-1">Use one of the demo accounts below.</p>
          </div>
          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Email</Label>
              <Input id="email" data-testid="login-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-10 mt-1" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Password</Label>
              <Input id="password" data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-10 mt-1" />
            </div>
            <Button type="submit" disabled={busy} data-testid="login-submit-button" className="w-full h-10 bg-blue-700 hover:bg-blue-800 text-white">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
          <Card className="p-4 bg-slate-50 border-slate-200">
            <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase mb-3">Demo Accounts</div>
            <div className="space-y-1.5">
              {DEMO.map((d) => (
                <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword(d.password); }}
                  data-testid={`demo-account-${d.role.toLowerCase().replace(/[^a-z]/g,'-')}`}
                  className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-white transition border border-transparent hover:border-slate-200">
                  <span className="font-medium text-slate-700">{d.role}</span>
                  <span className="font-mono text-slate-500">{d.email}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
