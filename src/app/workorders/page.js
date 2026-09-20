"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Panel, EmptyState, StatusPill, PriorityTag, Btn, IconBtn, IconEdit, IconTrash, IconDownload, Modal, Field, inputClass } from "@/components/ui";
import { fmtD, fmtDT } from "@/lib/format";
import { WO_STATUSES, PRIORITIES } from "@/lib/constants";
import { ROLES } from "@/lib/roles";
import { exportToExcel } from "@/lib/exportExcel";
import { downloadCsv, stamp } from "@/lib/exportCsv";

const LOCKED = ["Completed", "Closed"];

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
  const [editing, setEditing] = useState(null);
  const [editError, setEditError] = useState("");
  const [removing, setRemoving] = useState(null);
  const [removeError, setRemoveError] = useState("");
  const [techs, setTechs] = useState([]);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setMe(d.user));
    fetch("/api/workorders").then((r) => r.json()).then((d) => setRows(d.workOrders || []));
  }, []);

  const isAdmin = me?.role === ROLES.ADMIN;

  useEffect(() => {
    if (isAdmin) fetch("/api/users").then((r) => (r.ok ? r.json() : null)).then((d) => d && setTechs(d.users || []));
  }, [isAdmin]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const query = q.trim().toLowerCase();
    return rows
      .filter((w) => !query || [w.no, w.notificationNo, w.job, w.description, w.assignedToName].join(" ").toLowerCase().includes(query))
      .filter((w) => !status || w.status === status)
      .filter((w) => !priority || w.priority === priority);
  }, [rows, q, status, priority]);

  function reload() {
    fetch("/api/workorders").then((r) => r.json()).then((d) => setRows(d.workOrders || []));
  }

  async function saveEdit() {
    setEditError("");
    const res = await fetch(`/api/workorders/${editing.no}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", job: editing.job, priority: editing.priority, assignedToName: editing.assignedToName || "" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setEditing(null); reload(); } else { setEditError(data.error || "Could not save changes."); }
  }

  async function remove(no) {
    setRemoveError("");
    const res = await fetch(`/api/workorders/${no}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setRemoving(null); reload(); } else { setRemoveError(data.error || "Could not remove work order."); }
  }

  function doExport() {
    exportToExcel(`WorkOrders_${new Date().toISOString().slice(0, 10)}.xlsx`, [
      { key: "no", header: "WO No." },
      { key: "notificationNo", header: "Notification no." },
      { key: "createdAt", header: "Created" },
      { key: "dept", header: "Dept" },
      { key: "location", header: "Location" },
      { key: "job", header: "Job" },
      { key: "description", header: "Description" },
      { key: "nature", header: "Nature" },
      { key: "priority", header: "Priority" },
      { key: "status", header: "Status" },
      { key: "assignedToName", header: "Assigned to" },
      { key: "plannedStart", header: "Planned start" },
      { key: "plannedEnd", header: "Planned end" },
      { key: "actualStart", header: "Actual start" },
      { key: "actualEnd", header: "Actual end" },
      { key: "workDone", header: "Work done" },
      { key: "spares", header: "Spares" },
      { key: "remarks", header: "Remarks" },
      { key: "completedByName", header: "Completed by" },
    ], rows || []);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{me?.role === "TECH" ? "My Work Orders" : "Work Orders"}</h1>
        <div className="flex items-center gap-2">
          <Btn disabled={!filtered.length} onClick={() => downloadCsv(`work-orders-${stamp()}.csv`, EXPORT_COLUMNS, filtered)}>
            Export CSV
          </Btn>
          <Btn onClick={doExport} disabled={!rows || rows.length === 0}><IconDownload /> Export to Excel</Btn>
        </div>
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
            {PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
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
                  {isAdmin && <th className="px-4 py-2.5"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((w) => {
                  const locked = LOCKED.includes(w.status);
                  return (
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
                      {isAdmin && (
                        <td className="px-4 py-2.5">
                          {removing === w.no ? (
                            <div className="flex items-center gap-2 justify-end">
                              {removeError && <span className="text-xs text-red-600">{removeError}</span>}
                              <Btn onClick={() => { setRemoving(null); setRemoveError(""); }}>Cancel</Btn>
                              <Btn variant="danger" onClick={() => remove(w.no)}>Remove</Btn>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 justify-end">
                              <IconBtn title={locked ? "Locked — already completed / closed" : "Edit"} disabled={locked} onClick={() => { setEditing({ ...w }); setEditError(""); }}><IconEdit /></IconBtn>
                              <IconBtn title={locked ? "Locked — already completed / closed" : "Remove"} variant="danger" disabled={locked} onClick={() => { setRemoving(w.no); setRemoveError(""); }}><IconTrash /></IconBtn>
                            </div>
                          )}
                        </td>
                      )}
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
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Job" wide required><input className={inputClass} value={editing.job} onChange={(e) => setEditing({ ...editing, job: e.target.value })} /></Field>
            <Field label="Assigned to">
              <select className={inputClass} value={editing.assignedToName || ""} onChange={(e) => setEditing({ ...editing, assignedToName: e.target.value })}>
                <option value="">Unassigned</option>
                {techs.filter((u) => u.role === "TECH" || u.role === "ENGINEER").map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </Field>
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

export default function WorkOrdersPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <WorkOrdersInner />
    </Suspense>
  );
}
