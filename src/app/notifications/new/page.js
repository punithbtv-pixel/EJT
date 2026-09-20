"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, Field, Btn, inputClass } from "@/components/ui";
import LocationPicker, { emptyLocation, composeLocation } from "@/components/LocationPicker";
import { PRIORITIES } from "@/lib/constants";

export default function NewNotificationPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState([]);
  const [natures, setNatures] = useState([]);
  const [loc, setLoc] = useState(emptyLocation);
  const [form, setForm] = useState({ dept: "", nature: "", priority: "Medium", job: "", description: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments((d.departments || []).filter((x) => x.active && x.notif)));
    fetch("/api/natures").then((r) => r.json()).then((d) => setNatures((d.natures || []).filter((x) => x.active)));
  }, []);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  const location = composeLocation(loc);
  const locationComplete = Boolean(loc.plant && loc.section && loc.equipment);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.dept || !locationComplete || !form.nature || !form.job || !form.description) {
      setError("Fill in every field before raising the notification.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, location }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      router.push(`/notifications/${data.notification.no}`);
    } else {
      setError(data.error || "Could not raise the notification.");
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Create notification</h1>
      <form onSubmit={submit}>
        <Panel sub="Raised to engineering for review">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Department" required>
                <select className={inputClass} value={form.dept} onChange={set("dept")}>
                  <option value="">Select department</option>
                  {departments.map((d) => (<option key={d.name} value={d.name}>{d.name}</option>))}
                </select>
              </Field>
              <Field label="Nature of job" required>
                <select className={inputClass} value={form.nature} onChange={set("nature")}>
                  <option value="">Select nature</option>
                  {natures.map((n) => (<option key={n.name} value={n.name}>{n.name}</option>))}
                </select>
              </Field>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Location *</label>
              <LocationPicker value={loc} onChange={setLoc} />
              {loc.plant && <p className="text-xs text-slate-500 mt-2">Will be saved as: <span className="font-mono text-slate-700">{location}</span></p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Priority" required>
                <select className={inputClass} value={form.priority} onChange={set("priority")}>
                  {PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </Field>
            </div>
            <Field label="Job" wide required>
              <input className={inputClass} placeholder="e.g. Conveyor bearing replacement" value={form.job} onChange={set("job")} />
            </Field>
            <Field label="Job description" wide required>
              <textarea
                className={inputClass}
                rows={4}
                placeholder="What is the problem, where exactly, what has already been tried, and what is the effect on production?"
                value={form.description}
                onChange={set("description")}
              />
            </Field>
          </div>
          {error && <p className="px-4 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
            <Btn type="button" onClick={() => router.back()}>Discard</Btn>
            <Btn type="submit" variant="primary" disabled={saving}>{saving ? "Raising…" : "Raise notification"}</Btn>
          </div>
        </Panel>
      </form>
    </div>
  );
}
