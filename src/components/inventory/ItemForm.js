"use client";

import { useState } from "react";
import { Modal, Btn, Field, inputClass } from "@/components/ui";
import StockPill from "@/components/inventory/StockPill";
import { balanceOf, stockStatus, titleCase } from "@/lib/inventory";

const qty = (v) => Math.max(0, Number(v) || 0);
const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Add a spare (item = null) or edit one. Stock on hand is calculated from
// opening + received − issued, exactly as in the store sheets.
export default function ItemForm({ item, lists, onClose, onSaved }) {
  const editing = !!item;
  const [f, setF] = useState({
    name: item?.name ?? "",
    source: item?.source ?? "LOCAL",
    location: item?.location ?? "",
    dept: item ? titleCase(item.dept) : "",
    category: item?.category ?? "",
    opening: item?.opening ?? 0,
    received: item?.received ?? 0,
    issued: item?.issued ?? 0,
    reorderLevel: item?.reorderLevel ?? 0,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setF((v) => ({ ...v, [key]: e.target.value }));
  const balance = balanceOf({ opening: qty(f.opening), received: qty(f.received), issued: qty(f.issued) });
  const status = stockStatus(f.source, balance, qty(f.reorderLevel));

  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) {
      setError("Enter the item name.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(editing ? `/api/inventory/${item.id}` : "/api/inventory", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, opening: qty(f.opening), received: qty(f.received), issued: qty(f.issued), reorderLevel: qty(f.reorderLevel) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) onSaved(data.item, editing ? "edit" : "add");
    else setError(data.error || "Could not save the spare.");
  }

  const num = { type: "number", min: 0, step: "any", inputMode: "decimal" };

  return (
    <Modal title={editing ? "Edit spare" : "Add spare"} onClose={onClose} wide>
      <form onSubmit={submit} autoComplete="off">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Item name" wide required>
            <input id="inv-name" className={inputClass} value={f.name} onChange={set("name")} placeholder="e.g. BEARING 6205-2Z/C3" autoFocus />
          </Field>
          <Field label="Where to find it">
            <input id="inv-location" className={inputClass} list="inv-dl-location" value={f.location} onChange={set("location")} placeholder="e.g. RACK NO. 27 E" />
          </Field>
          <Field label="Department">
            <input id="inv-dept" className={inputClass} list="inv-dl-dept" value={f.dept} onChange={set("dept")} placeholder="e.g. Electrical" />
          </Field>
          <Field label="Category">
            <input id="inv-category" className={inputClass} list="inv-dl-category" value={f.category} onChange={set("category")} placeholder="e.g. Control Panel" />
          </Field>
          <Field label="Store list">
            <select id="inv-source" className={inputClass} value={f.source} onChange={set("source")} disabled={editing}>
              <option value="LOCAL">Local</option>
              <option value="IMPORTED">Imported</option>
            </select>
          </Field>
          <Field label="Opening stock">
            <input id="inv-opening" className={inputClass} {...num} value={f.opening} onChange={set("opening")} />
          </Field>
          <Field label="Received">
            <input id="inv-received" className={inputClass} {...num} value={f.received} onChange={set("received")} />
          </Field>
          <Field label="Issued">
            <input id="inv-issued" className={inputClass} {...num} value={f.issued} onChange={set("issued")} />
          </Field>
          <Field label="Reorder level">
            <input id="inv-reorder" className={inputClass} {...num} value={f.reorderLevel} onChange={set("reorderLevel")} />
            <p className="text-xs text-slate-400 mt-1">Flag as low when stock falls to this.</p>
          </Field>
          <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap text-sm text-slate-600">
            <span>Opening + Received − Issued =</span>
            <b className="text-xl text-slate-900 tabular-nums">{fmt(balance)}</b>
            <span>in stock</span>
            <StockPill status={status} />
          </div>
        </div>

        <datalist id="inv-dl-location">{lists.locations.map((x) => <option key={x} value={x} />)}</datalist>
        <datalist id="inv-dl-dept">{lists.depts.map((x) => <option key={x} value={x} />)}</datalist>
        <datalist id="inv-dl-category">{lists.categories.map((x) => <option key={x} value={x} />)}</datalist>

        {error && <p className="px-4 pb-3 text-sm font-medium text-red-600">{error}</p>}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <span className="mr-auto text-xs text-slate-500">{editing ? "Saved straight away." : "The new spare appears in the list immediately."}</span>
          <Btn type="button" onClick={onClose}>Cancel</Btn>
          <Btn type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add spare"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
