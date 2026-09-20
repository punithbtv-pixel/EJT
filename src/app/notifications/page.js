"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Panel, EmptyState, StatusPill, PriorityTag, Btn, IconBtn, IconEdit, IconTrash, IconDownload, IconLock, Modal, Field, inputClass } from "@/components/ui";
import { fmtD } from "@/lib/format";
import { NT_STATUSES, PRIORITIES } from "@/lib/constants";
import { ROLES } from "@/lib/roles";
import { exportToExcel } from "@/lib/exportExcel";

const LOCKED = ["Converted to Work Order", "Closed"];

function NotificationsInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [rows, setRows] = useState(null);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState(search.get("status") || "");
  const [priority, setPriority] = useState("");
  const [editing, setEditing] = useState(null);
  const [editError, setEditError] = useState("");
  const [removing, setRemoving] = useState(null);
  const [removeError, setRemoveError] = useState("");

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

  const canCreate = me && me.role !== "TECH";
  const isAdmin = me?.role === ROLES.ADMIN;

  function reload() {
    fetch("/api/notifications").then((r) => r.json()).then((d) => setRows(d.notifications || []));
  }

  async function saveEdit() {
    setEditError("");
    const res = await fetch(`/api/notifications/${editing.no}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job: editing.job, priority: editing.priority }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setEditing(null); reload(); } else { setEditError(data.error || "Could not save changes."); }
  }

  async function remove(no) {
    setRemoveError("");
    const res = await fetch(`/api/notifications/${no}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setRemoving(null); reload(); } else { setRemoveError(data.error || "Could not remove notification."); }
  }

  function doExport() {
    exportToExcel(`Notifications_${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { key: "no", header: "No." },
      { key: "date", header: "Date" },
      { key: "time", header: "Time" },
      { key: "raisedByName", header: "Raised by" },
      { key: "dept", header: "Dept" },
      { key: "location", header: "Location" },
      { key: "job", header: "Job" },
      { key: "description", header: "Description" },
      { key: "nature", header: "Nature" },
      { key: "priority", header: "Priority" },
      { key: "status", header: "Status" },
      { key: "workOrderNo", header: "Work order no." },
    ], rows || []);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
        <div className="flex items-center gap-2">
          <Btn onClick={doExport} disabled={!rows || rows.length === 0}><IconDownload /> Export to Excel</Btn>
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
            {PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
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
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((n) => {
                  const own = me && n.raisedByName === me.name;
                  const canManage = isAdmin || own;
                  const locked = LOCKED.includes(n.status);
                  return (
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
                      <td className="px-4 py-2.5">
                        {removing === n.no ? (
                          <div className="flex items-center gap-2 justify-end">
                            {removeError && <span className="text-xs text-red-600">{removeError}</span>}
                            <Btn onClick={() => { setRemoving(null); setRemoveError(""); }}>Cancel</Btn>
                            <Btn variant="danger" onClick={() => remove(n.no)}>Remove</Btn>
                          </div>
                        ) : canManage ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <IconBtn title={locked ? "Locked — already converted / closed" : "Edit"} disabled={locked} onClick={() => { setEditing({ ...n }); setEditError(""); }}><IconEdit /></IconBtn>
                            <IconBtn title={locked ? "Locked — already converted / closed" : "Remove"} variant="danger" disabled={locked} onClick={() => { setRemoving(n.no); setRemoveError(""); }}><IconTrash /></IconBtn>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end text-slate-300" title="Only visible to the person who raised it, or Administration"><IconLock /></div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {editing && (
        <Modal title={`Edit ${editing.no}`} onClose={() => setEditing(null)} wide>
          <div className="p-4 space-y-4">
            <Field label="Job" required><input className={inputClass} value={editing.job} onChange={(e) => setEditing({ ...editing, job: e.target.value })} /></Field>
            <Field label="Priority">
              <select className={inputClass} value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
          {editError && <p className="px-4 text-sm text-red-600">{editError}</p>}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
            <Btn onClick={() => setEditing(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={saveEdit}>Save changes</Btn>
          </div>
        </Modal>
      )}
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
