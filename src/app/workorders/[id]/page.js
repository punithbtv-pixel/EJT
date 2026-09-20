"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel, EmptyState, StatusPill, PriorityTag, Btn, Field, inputClass } from "@/components/ui";
import { fmtDT } from "@/lib/format";
import { WO_OPEN, WO_STATUSES, PRIORITIES } from "@/lib/constants";

const toInput = (s) => (s ? s.replace(" ", "T") : "");
const fromInput = (s) => (s ? s.replace("T", " ") : "");

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

// Resolves to the work order, or false when it can't be loaded.
async function fetchWorkOrder(id) {
  const res = await fetch(`/api/workorders/${id}`);
  return res.ok ? (await res.json()).workOrder : false;
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
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [lists, setLists] = useState({ departments: [], locations: [], natures: [], users: [] });

  function load() {
    return fetchWorkOrder(id).then(setW);
  }

  useEffect(() => {
    fetchWorkOrder(id).then(setW);
    fetch("/api/me").then((r) => r.json()).then((d) => setMe(d.user));
    fetch("/api/users").then((r) => r.json()).then((d) => setTechs((d.users || []).filter((u) => u.active && u.role === "TECH"))).catch(() => {});
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
      setEditing(false);
      load();
    } else {
      setError((await res.json().catch(() => ({}))).error || "Could not update the work order.");
    }
  }

  function startEdit() {
    setForm({
      dept: w.dept, location: w.location, nature: w.nature, priority: w.priority, status: w.status,
      job: w.job, description: w.description, assignedToName: w.assignedToName || "",
      plannedStart: toInput(w.plannedStart), plannedEnd: toInput(w.plannedEnd),
      actualStart: toInput(w.actualStart), actualEnd: toInput(w.actualEnd),
      workDone: w.workDone, spares: w.spares, remarks: w.remarks,
    });
    setError("");
    setEditing(true);
    Promise.all([
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/natures").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([d, l, na, u]) => setLists({
      departments: d.departments || [], locations: l.locations || [], natures: na.natures || [],
      users: (u.users || []).filter((x) => x.active),
    })).catch(() => {});
  }

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function saveEdit(e) {
    e.preventDefault();
    await act("edit", {
      fields: {
        ...form,
        plannedStart: fromInput(form.plannedStart), plannedEnd: fromInput(form.plannedEnd),
        actualStart: fromInput(form.actualStart), actualEnd: fromInput(form.actualEnd),
      },
    });
  }

  async function remove() {
    if (!window.confirm(`Delete ${w.no}? Notification ${w.notificationNo} will return to Accepted. This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/workorders/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/workorders");
    else setError((await res.json().catch(() => ({}))).error || "Could not delete the work order.");
  }

  if (w === null) return <p className="text-slate-500">Loading…</p>;
  if (w === false) return <EmptyState title="Work order not found" body="It may be outside your access scope." />;

  const isSupervisor = me && ["ADMIN", "ENGINEER"].includes(me.role);
  const isMine = me && w.assignedToName === me.name;
  const isAdmin = me?.role === "ADMIN";
  // Keep the current value selectable even if it was since removed from Settings.
  const opts = (names, current) => (!current || names.includes(current) ? names : [current, ...names]);
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
            {isAdmin && <Btn disabled={busy} onClick={() => (editing ? setEditing(false) : startEdit())}>{editing ? "Cancel edit" : "Edit"}</Btn>}
            {isAdmin && <Btn variant="danger" disabled={busy} onClick={remove}>Delete</Btn>}
          </div>
        </div>

        {isAdmin && editing && form && (
          <form onSubmit={saveEdit} className="border-t border-slate-200">
            <div className="px-4 pt-3 text-sm font-semibold text-slate-800">
              Edit work order <span className="font-normal text-slate-500">· Administrator access — every field can be changed</span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Working department" required>
                <select className={inputClass} value={form.dept} onChange={set("dept")}>
                  {opts(lists.departments.map((x) => x.name), form.dept).map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </Field>
              <Field label="Job location" required>
                <select className={inputClass} value={form.location} onChange={set("location")}>
                  {opts(lists.locations.map((x) => x.name), form.location).map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </Field>
              <Field label="Nature of job" required>
                <select className={inputClass} value={form.nature} onChange={set("nature")}>
                  {opts(lists.natures.map((x) => x.name), form.nature).map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </Field>
              <Field label="Priority" required>
                <select className={inputClass} value={form.priority} onChange={set("priority")}>
                  {PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </Field>
              <Field label="Status" required>
                <select className={inputClass} value={form.status} onChange={set("status")}>
                  {WO_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </Field>
              <Field label="Assigned to">
                <select className={inputClass} value={form.assignedToName} onChange={set("assignedToName")}>
                  <option value="">Unassigned</option>
                  {opts(lists.users.filter((u) => u.role === "TECH").map((u) => u.name), form.assignedToName).filter(Boolean).map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </Field>
              <Field label="Job" wide required>
                <input className={inputClass} value={form.job} onChange={set("job")} />
              </Field>
              <Field label="Work instructions" wide required>
                <textarea className={inputClass} rows={3} value={form.description} onChange={set("description")} />
              </Field>
              <Field label="Planned start" required>
                <input type="datetime-local" className={inputClass} value={form.plannedStart} onChange={set("plannedStart")} />
              </Field>
              <Field label="Planned end" required>
                <input type="datetime-local" className={inputClass} value={form.plannedEnd} onChange={set("plannedEnd")} />
              </Field>
              <Field label="Actual start">
                <input type="datetime-local" className={inputClass} value={form.actualStart} onChange={set("actualStart")} />
              </Field>
              <Field label="Actual end">
                <input type="datetime-local" className={inputClass} value={form.actualEnd} onChange={set("actualEnd")} />
              </Field>
              <Field label="Work done" wide>
                <textarea className={inputClass} rows={3} value={form.workDone} onChange={set("workDone")} />
              </Field>
              <Field label="Spare parts used">
                <input className={inputClass} value={form.spares} onChange={set("spares")} />
              </Field>
              <Field label="Remarks">
                <input className={inputClass} value={form.remarks} onChange={set("remarks")} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
              <Btn type="button" onClick={() => setEditing(false)}>Cancel</Btn>
              <Btn type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Btn>
            </div>
          </form>
        )}

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
