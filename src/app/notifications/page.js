"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Panel, EmptyState, StatusPill, PriorityTag, Btn, inputClass } from "@/components/ui";
import { fmtD } from "@/lib/format";
import { NT_STATUSES } from "@/lib/constants";
import { can } from "@/lib/roles";
import { downloadCsv, stamp } from "@/lib/exportCsv";

const EXPORT_COLUMNS = [
  { label: "Notification No.", value: (n) => n.no },
  { label: "Date", value: (n) => n.date },
  { label: "Time", value: (n) => n.time },
  { label: "Raised by", value: (n) => n.raisedByName },
  { label: "Department", value: (n) => n.dept },
  { label: "Location", value: (n) => n.location },
  { label: "Job", value: (n) => n.job },
  { label: "Description", value: (n) => n.description },
  { label: "Nature", value: (n) => n.nature },
  { label: "Priority", value: (n) => n.priority },
  { label: "Status", value: (n) => n.status },
  { label: "Work order", value: (n) => n.workOrderNo },
];

function NotificationsInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [rows, setRows] = useState(null);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState(search.get("status") || "");
  const [priority, setPriority] = useState("");

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setMe(d.user));
    fetch("/api/notifications").then((r) => r.json()).then((d) => setRows(d.notifications || []));
  }, []);

  const depts = useMemo(() => [...new Set((rows || []).map((n) => n.dept))].sort(), [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const query = q.trim().toLowerCase();
    return rows
      .filter((n) => !query || [n.no, n.job, n.description, n.raisedByName, n.workOrderNo].join(" ").toLowerCase().includes(query))
      .filter((n) => !dept || n.dept === dept)
      .filter((n) => !status || n.status === status)
      .filter((n) => !priority || n.priority === priority);
  }, [rows, q, dept, status, priority]);

  const canCreate = me && can(me.role, "createNotif");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
        <div className="flex gap-2">
          <Btn disabled={!filtered.length} onClick={() => downloadCsv(`notifications-${stamp()}.csv`, EXPORT_COLUMNS, filtered)}>
            Export CSV
          </Btn>
          {canCreate && (
            <Btn variant="primary" onClick={() => router.push("/notifications/new")}>
              + New notification
            </Btn>
          )}
        </div>
      </div>

      <Panel>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-b border-slate-200">
          <input className={inputClass} placeholder="Search notification, job, raised by…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={inputClass} value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">All departments</option>
            {depts.map((d) => (<option key={d} value={d}>{d}</option>))}
          </select>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            {NT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Any priority</option>
            {["Low", "Medium", "High", "Critical"].map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>

        {rows === null ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="No notifications match these filters" body="Clear a filter to see more records." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50">
                  <th className="px-4 py-2.5">No.</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Raised by</th>
                  <th className="px-4 py-2.5">Dept</th>
                  <th className="px-4 py-2.5">Job</th>
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">WO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((n) => (
                  <tr key={n.no} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs">
                      <Link href={`/notifications/${n.no}`} className="text-sky-600 font-semibold hover:underline">{n.no}</Link>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{fmtD(n.date)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{n.raisedByName}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{n.dept}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate" title={n.job}>{n.job}</td>
                    <td className="px-4 py-2.5"><PriorityTag priority={n.priority} /></td>
                    <td className="px-4 py-2.5"><StatusPill status={n.status} /></td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {n.workOrderNo ? <Link href={`/workorders/${n.workOrderNo}`} className="text-sky-600 hover:underline">{n.workOrderNo}</Link> : <span className="text-slate-300">—</span>}
                    </td>
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

export default function NotificationsPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <NotificationsInner />
    </Suspense>
  );
}
