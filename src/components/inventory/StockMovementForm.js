"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, Btn, Field, inputClass } from "@/components/ui";
import StockPill from "@/components/inventory/StockPill";
import LocationPicker, { emptyLocation, composeLocation } from "@/components/LocationPicker";
import { categoriesForSection } from "@/lib/locationTree";
import { stockStatus } from "@/lib/inventory";

const num = (v) => Math.max(0, Number(v) || 0);
const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
let lineKey = 0; // unique per spare line, so removing a line keeps the others
const newLine = (item = null, focus = "spare") => ({ key: ++lineKey, item, text: item?.name ?? "", qty: "", focus });
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// <input type="datetime-local"> wants the local time, not UTC.
function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// One spare on the slip: a search box, a quantity, and what the stock will be afterwards.
function SpareLine({ index, line, items, taken, issue, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const qtyRef = useRef(null);
  const { item } = line;

  const tokens = line.text.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = open
    ? items.filter((i) => !taken.has(i.id) && tokens.every((t) => `${i.name} ${i.location}`.toLowerCase().includes(t))).slice(0, 6)
    : [];

  const pick = (i) => {
    onChange({ item: i, text: i.name });
    setOpen(false);
    qtyRef.current?.focus();
  };

  const n = num(line.qty);
  const after = item ? Math.round((issue ? item.balance - n : item.balance + n) * 1000) / 1000 : 0;
  const over = issue && item && n > item.balance;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
      <div className="flex gap-2 items-start">
        <span className="mt-2 w-5 text-xs font-bold text-slate-400 tabular-nums">{index + 1}</span>
        <div className="relative flex-1 min-w-0">
          <input
            id={`mv-spare-${index}`}
            className={inputClass}
            value={line.text}
            role="combobox"
            aria-expanded={open}
            aria-controls={`mv-list-${index}`}
            aria-autocomplete="list"
            aria-label={`Spare ${index + 1}`}
            placeholder="Type a name, part no. or rack, then pick"
            autoFocus={line.focus === "spare"}
            onFocus={() => !item && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onChange={(e) => { onChange({ item: null, text: e.target.value }); setOpen(true); }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              if (hits[0]) pick(hits[0]);
            }}
          />
          {open && (
            <ul id={`mv-list-${index}`} className="absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg divide-y divide-slate-100">
              {hits.length ? hits.map((i) => (
                <li key={i.id}>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(i); }} className="w-full text-left px-3 py-2 hover:bg-sky-50 flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 truncate">{i.name}</span>
                      <span className="block text-xs text-slate-500">{i.location || "Location not set"}</span>
                    </span>
                    <span className="text-sm font-bold tabular-nums">{fmt(i.balance)}</span>
                  </button>
                </li>
              )) : <li className="px-3 py-3 text-sm text-slate-500">No spare matches. Check the spelling, or add it with “+ Add spare” first.</li>}
            </ul>
          )}
        </div>
        <input
          id={`mv-qty-${index}`}
          ref={qtyRef}
          autoFocus={line.focus === "qty"}
          className={`${inputClass} !w-24 text-right tabular-nums`}
          type="number" min={0} step="any" inputMode="decimal" placeholder="0"
          aria-label={`Quantity for spare ${index + 1}`}
          value={line.qty}
          onChange={(e) => onChange({ qty: e.target.value })}
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={!onRemove}
          aria-label={`Remove spare ${index + 1}`}
          className="mt-0.5 h-9 w-8 shrink-0 rounded-lg text-xl leading-none text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed"
        >
          &times;
        </button>
      </div>
      <div className="mt-1.5 min-h-[1.25rem] pl-7 text-xs">
        {item && (
          <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap text-slate-600">
            <span className="font-mono text-[11.5px] font-semibold bg-white border border-slate-300 rounded px-1.5 py-px">{item.location || "Location not set"}</span>
            <span>In stock now <b className="tabular-nums text-slate-900">{fmt(item.balance)}</b></span>
            <span className="text-slate-300">→</span>
            <span>{issue ? "after issue" : "after top-up"} <b className="tabular-nums text-slate-900">{fmt(after)}</b></span>
            <StockPill status={stockStatus(item.source, after, item.reorderLevel)} />
            {over && <span className="font-semibold text-red-600">Only {fmt(item.balance)} in stock. Lower the quantity.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// Issuance slip (kind = "issue") or top-up (kind = "topup"). Both take one or more
// spare lines; saving adds each line to the item's Issued / Received total.
export default function StockMovementForm({ kind, items, preset, lists, onClose, onSaved }) {
  const issue = kind === "issue";

  const [lines, setLines] = useState(() => [newLine(preset, preset ? "qty" : issue ? undefined : "spare")]);
  const [f, setF] = useState({ slipNo: "", when: "", issuedBy: "", issuedTo: "", dept: "", authorisedBy: "", vendor: "", invoiceNo: "" });
  const [loc, setLoc] = useState(emptyLocation);
  const [depts, setDepts] = useState(lists.depts);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!issue) return;
    fetch("/api/departments")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const names = (d?.departments || []).filter((x) => x.active).map((x) => x.name);
        if (names.length) setDepts(names);
      })
      .catch(() => {});
  }, [issue]);

  const set = (key) => (e) => setF((v) => ({ ...v, [key]: e.target.value }));
  const setLine = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const taken = (key) => new Set(lines.filter((l) => l.key !== key && l.item).map((l) => l.item.id));
  const picked = lines.filter((l) => l.item);
  const units = picked.reduce((t, l) => t + num(l.qty), 0);

  // The first thing wrong with the form, as [message, id of the field to focus].
  function problem() {
    if (issue && !f.slipNo.trim()) return ["Enter the issuance slip number.", "mv-slip"];
    if (!f.when) return [`Enter the date and time it was ${issue ? "issued" : "received"}.`, "mv-when"];
    for (const [i, l] of lines.entries()) {
      const tag = lines.length > 1 ? `Spare ${i + 1}: ` : "";
      if (!l.item) return [`${tag}pick the spare from the list.`, `mv-spare-${i}`];
      if (!(num(l.qty) > 0)) return [`${tag}enter the quantity ${issue ? "issued" : "received"}.`, `mv-qty-${i}`];
      if (issue && num(l.qty) > l.item.balance) return [`${tag}only ${fmt(l.item.balance)} of ${l.item.name} is in stock. Lower the quantity.`, `mv-qty-${i}`];
    }
    if (issue) {
      if (!f.issuedBy.trim()) return ["Enter who issued it.", "mv-by"];
      if (!f.issuedTo.trim()) return ["Enter who it is issued to.", "mv-to"];
      if (!f.dept) return ["Choose the department.", "mv-dept"];
      if (!f.authorisedBy.trim()) return ["Enter who authorised it.", "mv-auth"];
      if (!loc.plant) return ["Choose the plant.", null];
      if (!loc.section) return ["Choose the main section.", null];
      if (categoriesForSection(loc.plant, loc.section) && !loc.category) return ["Choose the sub-section.", null];
      if (!loc.equipment) return ["Choose the equipment / location.", null];
    } else {
      if (!f.vendor.trim()) return ["Enter the vendor it came from.", "mv-vendor"];
      if (!f.invoiceNo.trim()) return ["Enter the invoice number.", "mv-invoice"];
    }
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    const bad = problem();
    if (bad) {
      setError(bad[0]);
      if (bad[1]) document.getElementById(bad[1])?.focus();
      return;
    }
    setBusy(true);
    setError("");
    const body = {
      when: new Date(f.when).toISOString(),
      lines: lines.map((l) => ({ itemId: l.item.id, qty: num(l.qty) })),
      ...(issue
        ? { slipNo: f.slipNo, issuedBy: f.issuedBy, issuedTo: f.issuedTo, dept: f.dept, authorisedBy: f.authorisedBy, location: composeLocation(loc) }
        : { vendor: f.vendor, invoiceNo: f.invoiceNo }),
    };
    const res = await fetch(issue ? "/api/inventory/issue" : "/api/inventory/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) || {};
    setBusy(false);
    if (res?.ok) onSaved(data, kind);
    else setError(data.error || "Could not save. Check your connection and try again.");
  }

  const nowBtn = (
    <button type="button" onClick={() => setF((v) => ({ ...v, when: nowLocal() }))} className="shrink-0 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-3">
      Now
    </button>
  );

  const linesBlock = (
    <div className="sm:col-span-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{issue ? "Spares issued" : "Spares received"} *</span>
        <span className="flex-1" />
        <span className="text-xs text-slate-500">{plural(lines.length, "spare")} on this {issue ? "slip" : "delivery"}</span>
      </div>
      <div className="flex gap-2 px-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
        <span className="w-5" /><span className="flex-1">Spare</span><span className="w-24 text-right">{issue ? "Qty issued" : "Qty received"}</span><span className="w-8" />
      </div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <SpareLine
            key={l.key}
            index={i}
            line={l}
            items={items}
            taken={taken(l.key)}
            issue={issue}
            onChange={(patch) => setLine(l.key, patch)}
            onRemove={lines.length > 1 ? () => setLines((ls) => ls.filter((x) => x.key !== l.key)) : undefined}
          />
        ))}
      </div>
      <button type="button" onClick={() => setLines((ls) => [...ls, newLine()])} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-sky-400 text-sky-700 hover:bg-sky-50 text-sm font-medium px-3 py-1.5">
        <span className="text-base leading-none">+</span> Add another spare
      </button>
    </div>
  );

  const summary = (
    <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center gap-3 flex-wrap text-sm text-slate-600">
      {picked.length ? (
        <>
          <span>{issue ? "This slip issues" : "This delivery adds"}</span>
          <b className="text-xl text-slate-900 tabular-nums">{picked.length}</b>
          <span>{picked.length === 1 ? "spare" : "spares"}, total</span>
          <b className="text-xl text-slate-900 tabular-nums">{fmt(units)}</b>
          <span>units</span>
        </>
      ) : (
        <span className="text-slate-500">Pick a spare and enter a quantity to see what this {issue ? "slip issues" : "delivery adds"}.</span>
      )}
    </div>
  );

  return (
    <Modal title={issue ? "Issue spares" : "Top up stock"} onClose={onClose} wide={issue ? "xl" : true}>
      <form onSubmit={submit} autoComplete="off" noValidate>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {issue && (
            <Field label="Issuance slip no." required>
              <input id="mv-slip" className={`${inputClass} font-mono`} value={f.slipNo} onChange={set("slipNo")} placeholder="e.g. IS-2026-0418" autoFocus={!preset} />
            </Field>
          )}
          <Field label={issue ? "Issued date & time" : "Received date & time"} required>
            <div className="flex gap-2">
              <input id="mv-when" className={inputClass} type="datetime-local" value={f.when} onChange={set("when")} />
              {nowBtn}
            </div>
          </Field>

          {linesBlock}

          {issue ? (
            <>
              <Field label="Issued by" required>
                <input id="mv-by" className={inputClass} value={f.issuedBy} onChange={set("issuedBy")} placeholder="Storekeeper name" />
              </Field>
              <Field label="Issued to" required>
                <input id="mv-to" className={inputClass} value={f.issuedTo} onChange={set("issuedTo")} placeholder="Person who takes the spares" />
              </Field>
              <Field label="Department" required>
                <select id="mv-dept" className={inputClass} value={f.dept} onChange={set("dept")}>
                  <option value="">Select department</option>
                  {depts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Authorised by" required>
                <input id="mv-auth" className={inputClass} value={f.authorisedBy} onChange={set("authorisedBy")} placeholder="Supervisor who approved" />
              </Field>
              <div className="sm:col-span-2 -mb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Where they will be used</div>
              <div className="sm:col-span-2"><LocationPicker value={loc} onChange={setLoc} /></div>
            </>
          ) : (
            <>
              <Field label="Received from vendor" required>
                <input id="mv-vendor" className={inputClass} value={f.vendor} onChange={set("vendor")} placeholder="Vendor name" />
              </Field>
              <Field label="Invoice number" required>
                <input id="mv-invoice" className={inputClass} value={f.invoiceNo} onChange={set("invoiceNo")} placeholder="e.g. SBT/2026/1187" />
              </Field>
            </>
          )}

          {summary}
        </div>

        {error && <p role="alert" className="px-4 pb-3 text-sm font-medium text-red-600">{error}</p>}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <span className="mr-auto text-xs text-slate-500">
            {issue ? "The main inventory updates as soon as you save." : "The received total in the main inventory goes up when you save."}
          </span>
          <Btn type="button" onClick={onClose}>Cancel</Btn>
          <Btn
            type="submit"
            disabled={busy}
            className={issue ? "!bg-amber-600 hover:!bg-amber-700 !text-white" : "!bg-emerald-600 hover:!bg-emerald-700 !text-white"}
          >
            {busy ? "Saving…" : issue ? "Issue spares" : "Add to stock"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
