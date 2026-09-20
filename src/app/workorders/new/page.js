"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Panel, Field, Btn, inputClass } from "@/components/ui";

function NewWorkOrderInner() {
  const router = useRouter();
  const search = useSearchParams();
  const fromNo = search.get("from") || "";
  const [source, setSource] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ dept: "", assignedToName: "", plannedStart: "", plannedEnd: "", remarks: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (fromNo) fetch(`/api/notifications/${fromNo}`).then((r) => r.json()).then((d) => {
      setSource(d.notification || null);
      if (d.notification) setForm((f) => ({ ...f, dept: d.notification.dept }));
    });
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments((d.departments || []).filter((x) => x.active && x.work)));
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers((d.users || []).filter((x) => x.active && x.role === "TECH"))).catch(() => {});
  }, [fromNo]);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!fromNo || !form.dept || !form.plannedStart || !form.plannedEnd) {
      setError("Fill in every required field.");
      return;
    }
    if (form.plannedEnd <= form.plannedStart) {
      setError("Planned end must be after planned start.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/workorders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notificationNo: fromNo,
        dept: form.dept,
        location: source?.location,
        job: source?.job,
        description: source?.description,
        nature: source?.nature,
        priority: source?.priority,
        assignedToName: form.assignedToName || null,
        plannedStart: form.plannedStart.replace("T", " "),
        plannedEnd: form.plannedEnd.replace("T", " "),
        remarks: form.remarks,
      }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/workorders/${data.workOrder.no}`);
    else setError(data.error || "Could not create the work order.");
  }

  if (!fromNo) {
    return <p className="text-slate-500">Open a notification and choose &ldquo;Convert to work order&rdquo; to create one.</p>;
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Create work order</h1>
      <form onSubmit={submit}>
        <Panel sub={source ? `Converted from ${source.no}` : "Loading source notification…"}>
          {source && (
            <div className="mx-4 mt-4 rounded-lg bg-sky-50 text-sky-800 text-sm px-3 py-2">
              Job details below were carried over from notification <b>{source.no}</b>, raised by {source.raisedByName}.
            </div>
          )}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Job" wide>
              <input className={inputClass} value={source?.job || ""} disabled />
            </Field>
            <Field label="Working department" required>
              <select className={inputClass} value={form.dept} onChange={set("dept")}>
                <option value="">Select department</option>
                {departments.map((d) => (<option key={d.name} value={d.name}>{d.name}</option>))}
              </select>
            </Field>
            <Field label="Assigned engineer / technician">
              <select className={inputClass} value={form.assignedToName} onChange={set("assignedToName")}>
                <option value="">Leave unassigned for now</option>
                {users.map((u) => (<option key={u.username} value={u.name}>{u.name}</option>))}
              </select>
            </Field>
            <Field label="Planned start" required>
              <input type="datetime-local" className={inputClass} value={form.plannedStart} onChange={set("plannedStart")} />
            </Field>
            <Field label="Planned end" required>
              <input type="datetime-local" className={inputClass} value={form.plannedEnd} onChange={set("plannedEnd")} />
            </Field>
            <Field label="Additional work instructions" wide>
              <textarea className={inputClass} rows={3} placeholder="Permits, isolation, spares to draw, safety precautions…" value={form.remarks} onChange={set("remarks")} />
            </Field>
          </div>
          {error && <p className="px-4 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
            <Btn type="button" onClick={() => router.back()}>Discard</Btn>
            <Btn type="submit" variant="primary" disabled={saving || !source}>{saving ? "Creating…" : "Create work order"}</Btn>
          </div>
        </Panel>
      </form>
    </div>
  );
}

export default function NewWorkOrderPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <NewWorkOrderInner />
    </Suspense>
  );
}
