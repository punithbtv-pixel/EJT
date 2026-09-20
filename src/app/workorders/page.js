"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Panel, EmptyState, StatusPill, PriorityTag, Btn, inputClass } from "@/components/ui";
import { fmtD, fmtDT } from "@/lib/format";
import { WO_STATUSES } from "@/lib/constants";
import { downloadCsv, stamp } from "@/lib/exportCsv";

const EXPORT_COLUMNS = [
  { label: "Work order No.", value: (w) => w.no },
  { label: "Notification No.", value: (w) => w.notificationNo },
  { label: "Created", value: (w) => w.createdAt },
  { label: "Department", value: (w) => w.dept },
  { label: "Location", value: (w) => w.location },
  { label: "Job", value: (w) => w.job },
  { label: "Description", value: (w) => w.description },
  { label: "Nature", value: (w) => w.nature },
  { label: "Priority", value: (w) => w.priority },
  { label: "Status", value: (w) => w.status },
  { label: "Assigned to", value: (w) => w.assignedToName },
  { label: "Planned start", value: (w) => w.plannedStart },
  { label: "Planned end", value: (w) => w.plannedEnd },
  { label: "Actual start", value: (w) => w.actualStart },
  { label: "Actual end", value: (w) => w.actualEnd },
  { label: "Work done", value: (w) => w.workDone },
  { label: "Spare parts used", value: (w) => w.spares },
  { label: "Remarks", value: (w) => w.remarks },
  { label: "Completed by", value: (w) => w.completedByName },
];

function WorkOrdersInner() {
  const search = useSearchParams();
  const [rows, setRows] = useState(null);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(search.get("status") || "");
  const [priority, setPriority] = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setMe(d.user));
    fetch("/api/workorders").then((r) => r.json()).then((d) => setRows(d.workOrders || []));
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const query = q.trim().toLowerCase();
    return rows
      .filter((w) => !query || [w.no, w.notificationNo, w.job, w.description, w.assignedToName].join(" ").toLowerCase().includes(query))
      .filter((w) => !status || w.status === status)
      .filter((w) => !priority || w.priority === priority);
  }, [rows, q, status, priority]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{me?.role === "TECH" ? "My Work Orders" : "Work Orders"}</h1>
        <Btn disabled={!filtered.length} onClick={() => downloadCsv(`work-orders-${stamp()}.csv`, EXPORT_COLUMNS, filtered)}>
          Export CSV
        </Btn>
      </div>

      <Panel>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-b border-slate-200">
          <input className={inputClass} placeholder="Search WO no., notification, job…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            {WO_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Any priority</option>
            {["Low", "Medium", "High", "Critical"].map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>

        {rows === null ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="No work orders match these filters" body={me?.role === "TECH" ? "You are only shown work orders assigned to you." : "Clear a filter to see more records."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50">
                  <th className="px-4 py-2.5">WO No.</th>
                  <th className="px-4 py-2.5">Created</th>
                  <th className="px-4 py-2.5">Dept</th>
                  <th className="px-4 py-2.5">Job</th>
                  <th className="px-4 py-2.5">Assigned to</th>
                  <th className="px-4 py-2.5">Planned end</th>
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((w) => (
                  <tr key={w.no} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs">
                      <Link href={`/workorders/${w.no}`} className="text-sky-600 font-semibold hover:underline">{w.no}</Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{fmtD(w.createdAt)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{w.dept}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate" title={w.job}>{w.job}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{w.assignedToName || <span className="text-slate-400">Unassigned</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{fmtDT(w.plannedEnd)}</td>
                    <td className="px-4 py-2.5"><PriorityTag priority={w.priority} /></td>
                    <td className="px-4 py-2.5"><StatusPill status={w.status} kind="wo" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function WorkOrdersPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <WorkOrdersInner />
    </Suspense>
  );
}
