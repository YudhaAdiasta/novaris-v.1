import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reusable enterprise DataTable.
 * Props:
 *  - columns: [{ key, header, render?: (row) => ReactNode, align?: "left"|"right"|"center", className?: string }]
 *  - rows: any[]
 *  - searchKeys?: string[] (substring search across these row fields; if empty -> JSON.stringify whole row)
 *  - rowKey?: (row) => string
 *  - actions?: (row) => ReactNode  (rendered in the last column)
 *  - title?: string
 *  - description?: string
 *  - toolbar?: ReactNode  (e.g. <Button>+ Add</Button>)
 *  - emptyText?: string
 *  - pageSizeOptions?: number[]
 */
export default function DataTable({
  columns, rows, searchKeys, rowKey,
  actions, title, description, toolbar,
  emptyText = "No data.", pageSizeOptions = [10, 25, 50, 100],
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (searchKeys && searchKeys.length) return searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q));
      return JSON.stringify(r).toLowerCase().includes(q);
    });
  }, [rows, search, searchKeys]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = filtered.slice(start, start + pageSize);
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, total);

  return (
    <div className="space-y-3">
      {(title || description || toolbar) && (
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            {title && <h2 className="font-heading text-lg font-semibold text-slate-800">{title}</h2>}
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          <div className="flex items-center gap-2">{toolbar}</div>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="p-3 flex items-center justify-between gap-3 border-b border-slate-100 bg-white">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              data-testid="datatable-search"
              placeholder="Search…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 rounded-full bg-slate-50 border-slate-200 focus-visible:ring-teal-500"
            />
          </div>
          <div className="text-xs text-slate-500 hidden md:block">
            Showing <span className="font-semibold text-slate-700">{from}</span>–<span className="font-semibold text-slate-700">{to}</span> of <span className="font-semibold text-slate-700">{total}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="datatable">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                {columns.map((c) => (
                  <th key={c.key} className={`py-2.5 px-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"} ${c.className || ""}`}>{c.header}</th>
                ))}
                {actions && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {slice.map((row, idx) => (
                <tr key={rowKey ? rowKey(row) : (row.id ?? idx)} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                  {columns.map((c) => (
                    <td key={c.key} className={`py-2.5 px-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"} ${c.className || ""}`}>
                      {c.render ? c.render(row) : (row[c.key] ?? "—")}
                    </td>
                  ))}
                  {actions && <td className="py-1.5 px-3 text-right">{actions(row)}</td>}
                </tr>
              ))}
              {slice.length === 0 && (
                <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="py-12 text-center text-slate-400 text-sm">{emptyText}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-20 rounded-full"><SelectValue /></SelectTrigger>
              <SelectContent>{pageSizeOptions.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500 md:hidden">{from}–{to} of {total}</div>
            <Button data-testid="datatable-prev" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="rounded-full h-8 px-3"><ChevronLeft className="w-4 h-4 mr-1" />Previous</Button>
            <div className="text-xs font-medium text-slate-600 px-2">Page {safePage} of {totalPages}</div>
            <Button data-testid="datatable-next" variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="rounded-full h-8 px-3">Next<ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const RowActions = ({ children }) => (
  <div className="inline-flex items-center gap-0.5">{children}</div>
);

export const IconAction = ({ icon: Icon, label, onClick, tone = "default" }) => {
  const toneCls = tone === "danger" ? "text-rose-600 hover:bg-rose-50" : tone === "primary" ? "text-teal-700 hover:bg-teal-50" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900";
  return (
    <button onClick={onClick} title={label} aria-label={label} className={`w-8 h-8 inline-flex items-center justify-center rounded-md transition ${toneCls}`} data-testid={`row-action-${label.toLowerCase().replace(/\s+/g,'-')}`}>
      <Icon className="w-4 h-4" />
    </button>
  );
};
