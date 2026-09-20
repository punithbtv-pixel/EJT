"use client";

import { useEffect, useState } from "react";
import { Panel, Btn, IconBtn, IconEdit, IconTrash, Modal, Field, inputClass } from "@/components/ui";
import { ROLES, roleLabel } from "@/lib/roles";

const TABS = [
  { key: "departments", label: "Departments" },
  { key: "natures", label: "Job Nature" },
  { key: "users", label: "Users" },
];

// The list endpoints answer { <endpoint>: [...] }, e.g. /api/natures -> { natures }.
async function fetchList(endpoint) {
  const res = await fetch(`/api/${endpoint}`);
  return (await res.json())[endpoint] || [];
}

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

function MasterList({ endpoint, extraRender, withDeptFlags, deletable }) {
  const [rows, setRows] = useState(null);
  const [newName, setNewName] = useState("");
  const [usedFor, setUsedFor] = useState("both");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editFlags, setEditFlags] = useState({ notif: true, work: true });
  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState("");

  function load() {
    return fetchList(endpoint).then(setRows);
  }
  useEffect(() => { fetchList(endpoint).then(setRows); }, [endpoint]);

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
  function startEdit(row) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditFlags({ notif: row.notif ?? true, work: row.work ?? true });
  }
  async function saveEdit(row) {
    if (!editName.trim()) return;
    const patch = { id: row.id, name: editName.trim() };
    if (withDeptFlags) Object.assign(patch, editFlags);
    await fetch(`/api/${endpoint}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setEditingId(null);
    load();
  }
  async function remove(row) {
    setRemoveError("");
    const res = await fetch(`/api/${endpoint}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRemovingId(null);
      load();
    } else {
      setRemoveError(data.error || "Could not remove.");
    }
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
            <div key={row.id} className="px-4 py-2.5">
              {editingId === row.id ? (
                <div className="flex flex-wrap items-center gap-3">
                  <input className={`${inputClass} max-w-xs`} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                  {withDeptFlags && (
                    <>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" checked={editFlags.notif} onChange={(e) => setEditFlags((f) => ({ ...f, notif: e.target.checked }))} /> Notifications
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input type="checkbox" checked={editFlags.work} onChange={(e) => setEditFlags((f) => ({ ...f, work: e.target.checked }))} /> Work orders
                      </label>
                    </>
                  )}
                  <span className="flex-1" />
                  <Btn variant="primary" onClick={() => saveEdit(row)}>Save</Btn>
                  <Btn onClick={() => setEditingId(null)}>Cancel</Btn>
                </div>
              ) : removingId === row.id ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-700">Remove <strong>{row.name}</strong>?</span>
                  {removeError && <span className="text-xs text-red-600">{removeError}</span>}
                  <span className="flex-1" />
                  <Btn onClick={() => { setRemovingId(null); setRemoveError(""); }}>Cancel</Btn>
                  <Btn variant="danger" onClick={() => remove(row)}>Remove</Btn>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${row.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{row.name}</span>
                  {extraRender && extraRender(row)}
                  <span className="flex-1" />
                  {deletable && row.inUse > 0 && <span className="text-[11px] text-slate-400">used by {row.inUse}</span>}
                  <IconBtn title="Edit" onClick={() => startEdit(row)}><IconEdit /></IconBtn>
                  {deletable && (
                    <IconBtn
                      title={row.inUse > 0 ? `In use by ${row.inUse} record${row.inUse === 1 ? "" : "s"} — deactivate instead of removing` : "Remove"}
                      variant="danger"
                      disabled={row.inUse > 0}
                      onClick={() => { setRemovingId(row.id); setRemoveError(""); }}
                    >
                      <IconTrash />
                    </IconBtn>
                  )}
                  <Switch on={row.active} onClick={() => toggle(row)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab({ me }) {
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", dept: "", designation: "", role: ROLES.DEPT, email: "", mobile: "" });
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [editError, setEditError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState("");

  async function fetchUsers() {
    const res = await fetch("/api/users");
    return res.ok ? (await res.json()).users : [];
  }
  function load() {
    return fetchUsers().then(setRows);
  }
  useEffect(() => { fetchUsers().then(setRows); }, []);

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

  async function saveEdit() {
    setEditError("");
    const body = {
      role: editing.role, dept: editing.dept, designation: editing.designation,
      email: editing.email, mobile: editing.mobile,
    };
    if (editing.password) body.password = editing.password;
    const res = await fetch(`/api/users/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setEditing(null); load(); } else { setEditError(data.error || "Could not save changes."); }
  }

  async function remove(u) {
    setRemoveError("");
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setRemovingId(null); load(); } else { setRemoveError(data.error || "Could not remove user."); }
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
                <th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((u) => {
                const isSelf = u.username === me?.username;
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5 font-medium">{u.name}{isSelf && <span className="ml-1.5 text-[10px] text-sky-600 font-semibold">(you)</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-2.5">{u.dept}</td>
                    <td className="px-4 py-2.5">{roleLabel(u.role)}</td>
                    <td className="px-4 py-2.5"><Switch on={u.active} onClick={() => toggle(u)} /></td>
                    <td className="px-4 py-2.5">
                      {removingId === u.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          {removeError && <span className="text-xs text-red-600">{removeError}</span>}
                          <Btn onClick={() => { setRemovingId(null); setRemoveError(""); }}>Cancel</Btn>
                          <Btn variant="danger" onClick={() => remove(u)}>Remove</Btn>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 justify-end">
                          <IconBtn title="Edit" onClick={() => { setEditing({ ...u, password: "" }); setEditError(""); }}><IconEdit /></IconBtn>
                          <IconBtn title={isSelf ? "You can't remove your own account" : "Remove"} variant="danger" disabled={isSelf} onClick={() => { setRemovingId(u.id); setRemoveError(""); }}><IconTrash /></IconBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Department"><input className={inputClass} value={editing.dept} onChange={(e) => setEditing({ ...editing, dept: e.target.value })} /></Field>
            <Field label="Designation"><input className={inputClass} value={editing.designation} onChange={(e) => setEditing({ ...editing, designation: e.target.value })} /></Field>
            <Field label="Role">
              <select className={inputClass} value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                {Object.values(ROLES).map((r) => (<option key={r} value={r}>{roleLabel(r)}</option>))}
              </select>
            </Field>
            <Field label="Email"><input className={inputClass} value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Mobile" wide><input className={inputClass} value={editing.mobile || ""} onChange={(e) => setEditing({ ...editing, mobile: e.target.value })} /></Field>
            <Field label="New password" wide>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to keep the current password"
                value={editing.password || ""}
                onChange={(e) => setEditing({ ...editing, password: e.target.value })}
              />
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

export default function SettingsPage() {
  const [tab, setTab] = useState("departments");
  const [me, setMe] = useState(null);

  useEffect(() => {
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((d) => d && setMe(d.user)).catch(() => {});
  }, []);

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
            deletable
            extraRender={(d) => (
              <span className="flex gap-1">
                {d.notif && <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">Notification</span>}
                {d.work && <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5">Work order</span>}
              </span>
            )}
          />
        )}
        {tab === "natures" && <MasterList endpoint="natures" deletable />}
        {tab === "users" && <UsersTab me={me} />}
      </Panel>
    </div>
  );
}
