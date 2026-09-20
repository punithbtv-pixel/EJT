"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { Panel, EmptyState, StatusPill, PriorityTag, Btn, inputClass } from "@/components/ui";
import { fmtDT } from "@/lib/format";
import { WO_OPEN } from "@/lib/constants";

function Timeline({ items }) {
  return (
    <div className="space-y-0">
      {items.map((h, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 mt-1.5" />
            {i < items.length - 1 && <span className="w-px flex-1 bg-slate-200" />}
          </div>
          <div className="pb-4 min-w-0">
            <div className="text-sm text-slate-800">{h.text}</div>
            <div className="text-xs text-slate-500 font-mono">{fmtDT(h.at)} · {h.who || "System"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkOrderDetailPage({ params }) {
  const { id } = usePromise(params);
  const [w, setW] = useState(null);
  const [me, setMe] = useState(null);
  const [techs, setTechs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [showAssign, setShowAssign] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [complete, setComplete] = useState({ workDone: "", spares: "", remarks: "" });

  async function load() {
    const res = await fetch(`/api/workorders/${id}`);
    if (res.ok) setW((await res.json()).workOrder);
    else setW(false);
  }

  useEffect(() => {
    load();
    fetch("/api/me").then((r) => r.json()).then((d) => setMe(d.user));
    fetch("/api/users").then((r) => r.json()).then((d) => setTechs((d.users || []).filter((u) => u.active && u.role === "TECH"))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action, body = {}) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/workorders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    setBusy(false);
    if (res.ok) {
      setShowAssign(false);
      setShowComplete(false);
      load();
    } else {
      setError((await res.json().catch(() => ({}))).error || "Could not update the work order.");
    }
  }

  if (w === null) return <p className="text-slate-500">Loading…</p>;
  if (w === false) return <EmptyState title="Work order not found" body="It may be outside your access scope." />;

  const isSupervisor = me && ["ADMIN", "ENGINEER"].includes(me.role);
  const isMine = me && w.assignedToName === me.name;
  const late = WO_OPEN.includes(w.status) && new Date(w.plannedEnd.replace(" ", "T")) < new Date();

  return (
    <div className="space-y-4">
      <Panel>
        <div className="p-4 flex flex-wrap gap-4 items-start">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs text-sky-600 font-semibold">{w.no}</div>
            <h1 className="text-lg font-semibold text-slate-900 mt-1">{w.job}</h1>
            <p className="text-sm text-slate-500 mt-1">Raised as {w.notificationNo} · dept {w.dept}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusPill status={w.status} kind="wo" />
              <PriorityTag priority={w.priority} />
              {late && <StatusPill status="Past planned end" kind="wo" />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isSupervisor && ["Pending", "Assigned"].includes(w.status) && (
              <Btn onClick={() => setShowAssign((v) => !v)}>{w.assignedToName ? "Reassign" : "Assign"}</Btn>
            )}
            {me?.role === "TECH" && isMine && w.status === "Assigned" && <Btn variant="primary" disabled={busy} onClick={() => act("start")}>Start work</Btn>}
            {me?.role === "TECH" && isMine && w.status === "In Progress" && <Btn disabled={busy} onClick={() => act("hold")}>Put on hold</Btn>}
            {me?.role === "TECH" && isMine && w.status === "On Hold" && <Btn disabled={busy} onClick={() => act("resume")}>Resume</Btn>}
            {me?.role === "TECH" && isMine && ["In Progress", "On Hold"].includes(w.status) && (
              <Btn variant="primary" onClick={() => setShowComplete((v) => !v)}>Complete work</Btn>
            )}
            {isSupervisor && w.status === "Completed" && <Btn variant="primary" disabled={busy} onClick={() => act("close")}>Verify and close</Btn>}
            {isSupervisor && WO_OPEN.includes(w.status) && <Btn variant="danger" disabled={busy} onClick={() => act("cancel")}>Cancel</Btn>}
            <Link href={`/notifications/${w.notificationNo}`}>
              <Btn type="button">Source {w.notificationNo}</Btn>
            </Link>
          </div>
        </div>

        {showAssign && (
          <div className="px-4 pb-4 flex gap-2 items-end">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Engineer / technician</label>
              <select className={inputClass} value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                <option value="">Select…</option>
                {techs.map((t) => (<option key={t.username} value={t.name}>{t.name}</option>))}
              </select>
            </div>
            <Btn variant="primary" disabled={!assignTo || busy} onClick={() => act("assign", { assignedToName: assignTo })}>Assign</Btn>
          </div>
        )}

        {showComplete && (
          <div className="px-4 pb-4 space-y-3 max-w-xl">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Work done *</label>
              <textarea className={inputClass} rows={3} value={complete.workDone} onChange={(e) => setComplete((c) => ({ ...c, workDone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Spare parts used</label>
              <input className={inputClass} value={complete.spares} onChange={(e) => setComplete((c) => ({ ...c, spares: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Completion remarks</label>
              <input className={inputClass} value={complete.remarks} onChange={(e) => setComplete((c) => ({ ...c, remarks: e.target.value }))} />
            </div>
            <Btn variant="primary" disabled={!complete.workDone || busy} onClick={() => act("complete", complete)}>Mark complete</Btn>
          </div>
        )}

        {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 border-t border-slate-200 text-sm">
          {[
            ["Job location", w.location], ["Nature of job", w.nature],
            ["Assigned to", w.assignedToName || "Unassigned"], ["Status", w.status],
            ["Planned start", fmtDT(w.plannedStart)], ["Planned end", fmtDT(w.plannedEnd)],
            ["Actual start", fmtDT(w.actualStart)], ["Actual end", fmtDT(w.actualEnd)],
          ].map(([k, v]) => (
            <div key={k} className="bg-white p-3">
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Execution &amp; completion">
          <div className="p-4 space-y-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Work instructions</div>
              <p className="text-slate-700">{w.description}{w.remarks ? <><br /><b>Note:</b> {w.remarks}</> : null}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Work done</div>
              <p className="text-slate-700">{w.workDone || <span className="text-slate-400">Not recorded yet.</span>}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Spare parts used</div>
              <p className="text-slate-700">{w.spares || <span className="text-slate-400">None recorded.</span>}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Completed by</div>
              <p className="text-slate-700">{w.completedByName ? `${w.completedByName} · ${fmtDT(w.completedAt)}` : <span className="text-slate-400">Pending</span>}</p>
            </div>
          </div>
        </Panel>
        <Panel title="Activity timeline" sub={`${w.history.length} entries`}>
          <div className="p-4">
            <Timeline items={w.history} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
