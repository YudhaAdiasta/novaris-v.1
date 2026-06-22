import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DataTable, { RowActions, IconAction } from "@/components/DataTable";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

export default function RiskTaxonomy() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api.get("/categories").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api.put(`/categories/${editing.id}`, editing);
      else await api.post("/categories", editing);
      toast.success("Saved"); setOpen(false); setEditing(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const toggleStatus = async (c) => {
    const next = { ...c, status: c.status === "Active" ? "Inactive" : "Active" };
    try { await api.put(`/categories/${c.id}`, next); toast.success(`${c.name} ${next.status === "Active" ? "activated" : "deactivated"}`); load(); }
    catch { toast.error("Failed to toggle"); }
  };

  const columns = [
    { key: "code", header: "Code", render: (c) => <span className="font-mono text-xs text-slate-700">{c.code}</span> },
    { key: "name", header: "Name", render: (c) => <span className="font-medium text-slate-800">{c.name}</span> },
    { key: "description", header: "Description", render: (c) => <span className="text-slate-600 text-sm max-w-md truncate inline-block">{c.description}</span> },
    {
      key: "status", header: "Active", render: (c) => (
        <div className="flex items-center gap-2">
          <Switch checked={c.status === "Active"} onCheckedChange={() => toggleStatus(c)} data-testid={`toggle-${c.code}`} />
          <span className={`text-xs ${c.status === "Active" ? "text-teal-700" : "text-slate-400"}`}>{c.status}</span>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Risk Taxonomy</h1>
          <p className="text-sm text-slate-500 mt-1">Master list of risk categories used across the organisation.</p>
        </div>
        <Button onClick={() => { setEditing({ code:"", name:"", description:"", status:"Active" }); setOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="w-4 h-4 mr-1" />Add Category
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={list}
        searchKeys={["code", "name", "description"]}
        rowKey={(c) => c.id}
        emptyText="No categories yet."
        actions={(c) => (
          <RowActions>
            <IconAction icon={Pencil} label="Edit" tone="primary" onClick={() => { setEditing(c); setOpen(true); }} />
          </RowActions>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Add"} Category</DialogTitle></DialogHeader>
          {editing && <div className="space-y-3">
            <div><Label>Code</Label><Input value={editing.code} onChange={(e) => setEditing({...editing, code: e.target.value})} /></div>
            <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({...editing, name: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea value={editing.description} onChange={(e) => setEditing({...editing, description: e.target.value})} /></div>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div><Label className="!mt-0">Active</Label><div className="text-xs text-slate-500">Inactive categories are hidden from new risk forms.</div></div>
              <Switch checked={editing.status === "Active"} onCheckedChange={(v) => setEditing({...editing, status: v ? "Active" : "Inactive"})} />
            </div>
          </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-teal-600 hover:bg-teal-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
