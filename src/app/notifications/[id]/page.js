"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel, EmptyState, StatusPill, PriorityTag, Btn, Field, inputClass } from "@/components/ui";
import { fmtD, fmtDT } from "@/lib/format";
import { PRIORITIES, NT_STATUSES } from "@/lib/constants";

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

// Resolves to the notification, or false when it can't be loaded.
async function fetchNotification(id) {
  const res = await fetch(`/api/notifications/${id}`);
  return res.ok ? (await res.json()).notification : false;
}

export default function NotificationDetailPage({ params }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [n, setN] = useState(null);
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [lists, setLists] = useState({ departments: [], locations: [], natures: [] });

  function load() {
    return fetchNotification(id).then(setN);
  }

  useEffect(() => {
    fetchNotification(id).then(setN);
    fetch("/api/me").then((r) => r.json()).then((d) => setMe(d.user));
  }, [id]);

  async function setStatus(status) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) load();
    else setError((await res.json().catch(() => ({}))).error || "Could not update the notification.");
  }

  function startEdit() {
    setForm({ dept: n.dept, location: n.location, nature: n.nature, priority: n.priority, status: n.status, job: n.job, description: n.description });
    setError("");
    setEditing(true);
    Promise.all([
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/natures").then((r) => r.json()),
    ]).then(([d, l, na]) => setLists({ departments: d.departments || [], locations: l.locations || [], natures: na.natures || [] })).catch(() => {});
  }

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edit: form }),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      load();
    } else {
      setError((await res.json().catch(() => ({}))).error || "Could not save the notification.");
    }
  }

  async function remove() {
    const msg = n.workOrderNo
      ? `Delete ${n.no} and its work order ${n.workOrderNo}? This cannot be undone.`
      : `Delete ${n.no}? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/notifications");
    else setError((await res.json().catch(() => ({}))).error || "Could not delete the notification.");
  }

  if (n === null) return <p className="text-slate-500">Loading…</p>;
  if (n === false) return <EmptyState title="Notification not found" body="It may be outside your access scope." />;

  const canReview = me && ["ADMIN", "ENGINEER"].includes(me.role) && !["Rejected", "Closed"].includes(n.status);
  const canConvert = canReview && !n.workOrderNo;
  const isAdmin = me?.role === "ADMIN";
  // Keep the current value selectable even if it was since removed from Settings.
  const opts = (rows, current) => {
    const names = rows.map((r) => r.name);
    return names.includes(current) ? names : [current, ...names];
  };

  return (
    <div className="space-y-4">
      <Panel>
        <div className="p-4 flex flex-wrap gap-4 items-start">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs text-sky-600 font-semibold">{n.no}</div>
            <h1 className="text-lg font-semibold text-slate-900 mt-1">{n.job}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Raised by {n.raisedByName} · {fmtD(n.date)} at {n.time} · {n.dept} &rsaquo; {n.location}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <StatusPill status={n.status} />
              <PriorityTag priority={n.priority} />
              <span className="text-xs text-slate-500">{n.nature}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReview && n.status === "Raised" && <Btn disabled={busy} onClick={() => setStatus("Under Review")}>Mark under review</Btn>}
            {canReview && ["Raised", "Under Review"].includes(n.status) && <Btn disabled={busy} onClick={() => setStatus("Accepted")}>Accept</Btn>}
            {canReview && ["Raised", "Under Review"].includes(n.status) && <Btn variant="danger" disabled={busy} onClick={() => setStatus("Rejected")}>Reject</Btn>}
            {canConvert && <Btn variant="primary" onClick={() => router.push(`/workorders/new?from=${n.no}`)}>Convert to work order</Btn>}
            {n.workOrderNo && <Btn onClick={() => router.push(`/workorders/${n.workOrderNo}`)}>Open {n.workOrderNo}</Btn>}
            {isAdmin && <Btn disabled={busy} onClick={() => (editing ? setEditing(false) : startEdit())}>{editing ? "Cancel edit" : "Edit"}</Btn>}
            {isAdmin && <Btn variant="danger" disabled={busy} onClick={remove}>Delete</Btn>}
          </div>
        </div>
        {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
      </Panel>

      {isAdmin && editing && form && (
        <form onSubmit={saveEdit}>
          <Panel title="Edit notification" sub="Administrator access — every field can be changed">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Department" required>
                <select className={inputClass} value={form.dept} onChange={set("dept")}>
                  {opts(lists.departments, form.dept).map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </Field>
              <Field label="Location" required>
                <select className={inputClass} value={form.location} onChange={set("location")}>
                  {opts(lists.locations, form.location).map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </Field>
              <Field label="Nature of job" required>
                <select className={inputClass} value={form.nature} onChange={set("nature")}>
                  {opts(lists.natures, form.nature).map((x) => (<option key={x} value={x}>{x}</option>))}
                </select>
              </Field>
              <Field label="Priority" required>
                <select className={inputClass} value={form.priority} onChange={set("priority")}>
                  {PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </Field>
              <Field label="Status" required>
                <select className={inputClass} value={form.status} onChange={set("status")}>
                  {NT_STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </Field>
              <Field label="Job" wide required>
                <input className={inputClass} value={form.job} onChange={set("job")} />
              </Field>
              <Field label="Job description" wide required>
                <textarea className={inputClass} rows={4} value={form.description} onChange={set("description")} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
              <Btn type="button" onClick={() => setEditing(false)}>Cancel</Btn>
              <Btn type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Btn>
            </div>
          </Panel>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Problem description">
          <div className="p-4">
            <p className="text-sm text-slate-700 leading-relaxed">{n.description}</p>
          </div>
        </Panel>
        <Panel title="Activity history" sub={`${n.history.length} entries`}>
          <div className="p-4">
            <Timeline items={n.history} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
