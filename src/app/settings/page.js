"use client";

import { useEffect, useState } from "react";
import { Panel, Btn, inputClass } from "@/components/ui";
import { ROLES, roleLabel } from "@/lib/roles";
import { PRIORITY_INFO } from "@/lib/constants";

const TABS = [
  { key: "departments", label: "Departments" },
  { key: "locations", label: "Locations" },
  { key: "natures", label: "Job Nature" },
  { key: "priority", label: "Priority" },
  { key: "users", label: "Users" },
];

function Switch({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${on ? "bg-sky-600" : "bg-slate-300"}`}
      style={{ height: 22 }}
      aria-pressed={on}
    >
      <span className="absolute top-0.5 left-0.5 h-4.5 w-4.5 bg-white rounded-full shadow transition-transform" style={{ transform: on ? "translateX(18px)" : "none" }} />
    </button>
  );
}

function MasterList({ endpoint, extraRender, withDeptFlags }) {
  const [rows, setRows] = useState(null);
  const [newName, setNewName] = useState("");
  const [usedFor, setUsedFor] = useState("both");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const listKey = endpoint;
  async function load() {
    const res = await fetch(`/api/${endpoint}`);
    const data = await res.json();
    setRows(data[listKey] || []);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (!newName.trim()) return;
    await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withDeptFlags ? { name: newName.trim(), usedFor } : { name: newName.trim() }),
    });
    setNewName("");
    load();
  }
  async function toggle(row) {
    await fetch(`/api/${endpoint}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, active: !row.active }),
    });
    load();
  }
  async function saveRename(row) {
    if (!editName.trim()) return;
    await fetch(`/api/${endpoint}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, name: editName.trim() }),
    });
    setEditingId(null);
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-4 border-b border-slate-200">
        <input className={`${inputClass} max-w-xs`} placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        {withDeptFlags && (
          <select className={`${inputClass} max-w-xs`} value={usedFor} onChange={(e) => setUsedFor(e.target.value)}>
            <option value="both">Notifications and work orders</option>
            <option value="notif">Notifications only</option>
            <option value="work">Work orders only</option>
          </select>
        )}
        <Btn variant="primary" onClick={add}>+ Add</Btn>
      </div>
      {rows === null ? (
        <p className="p-4 text-slate-500">Loading…</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
              {editingId === row.id ? (
                <>
                  <input className={`${inputClass} max-w-xs`} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                  <Btn variant="primary" onClick={() => saveRename(row)}>Save</Btn>
                  <Btn onClick={() => setEditingId(null)}>Cancel</Btn>
                </>
              ) : (
                <>
                  <span className={`text-sm font-medium ${row.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{row.name}</span>
                  {extraRender && extraRender(row)}
                  <span className="flex-1" />
                  <Btn onClick={() => { setEditingId(row.id); setEditName(row.name); }}>Rename</Btn>
                  <Switch on={row.active} onClick={() => toggle(row)} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", dept: "", designation: "", role: ROLES.DEPT, email: "", mobile: "" });
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/users");
    if (res.ok) setRows((await res.json()).users);
    else setRows([]);
  }
  useEffect(() => { load(); }, []);

  async function toggle(u) {
    await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    load();
  }

  async function addUser(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setForm({ name: "", username: "", password: "", dept: "", designation: "", role: ROLES.DEPT, email: "", mobile: "" });
      load();
    } else {
      setError(data.error || "Could not add the user.");
    }
  }

  return (
    <div>
      <form onSubmit={addUser} className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-200">
        <input className={inputClass} placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <input className={inputClass} placeholder="Username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
        <input className={inputClass} type="password" placeholder="Password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        <input className={inputClass} placeholder="Department" value={form.dept} onChange={(e) => setForm((f) => ({ ...f, dept: e.target.value }))} />
        <input className={inputClass} placeholder="Designation" value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
        <select className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
          {Object.values(ROLES).map((r) => (<option key={r} value={r}>{roleLabel(r)}</option>))}
        </select>
        <input className={inputClass} placeholder="Email (optional)" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <input className={inputClass} placeholder="Mobile (optional)" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} />
        <Btn type="submit" variant="primary">+ Add user</Btn>
        {error && <p className="sm:col-span-3 text-sm text-red-600">{error}</p>}
      </form>
      {rows === null ? (
        <p className="p-4 text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">User management isn&rsquo;t available while the app is running in demo (UI-only) mode.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50">
                <th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Username</th><th className="px-4 py-2.5">Dept</th>
                <th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2.5 font-medium">{u.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-2.5">{u.dept}</td>
                  <td className="px-4 py-2.5">{roleLabel(u.role)}</td>
                  <td className="px-4 py-2.5"><Switch on={u.active} onClick={() => toggle(u)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState("departments");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${tab === t.key ? "bg-white shadow-sm text-slate-900" : "text-slate-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Panel>
        {tab === "departments" && (
          <MasterList
            endpoint="departments"
            withDeptFlags
            extraRender={(d) => (
              <span className="flex gap-1">
                {d.notif && <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">Notification</span>}
                {d.work && <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5">Work order</span>}
              </span>
            )}
          />
        )}
        {tab === "locations" && <MasterList endpoint="locations" />}
        {tab === "natures" && <MasterList endpoint="natures" />}
        {tab === "priority" && (
          <div className="divide-y divide-slate-100">
            {Object.entries(PRIORITY_INFO).map(([p, info]) => (
              <div key={p} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm font-semibold" style={{ color: info.color }}>{p}</span>
                <span className="flex-1" />
                <span className="text-xs text-slate-500">{info.note}</span>
              </div>
            ))}
            <p className="px-4 py-3 text-xs text-slate-500">Priority drives escalation colour and the attention list, so the four levels stay fixed.</p>
          </div>
        )}
        {tab === "users" && <UsersTab />}
      </Panel>
    </div>
  );
}
