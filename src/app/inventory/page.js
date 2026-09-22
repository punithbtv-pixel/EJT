"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, EmptyState, Btn, IconBtn, IconEdit, IconDownload, IconChevronDown, Modal } from "@/components/ui";
import StockPill from "@/components/inventory/StockPill";
import ItemForm from "@/components/inventory/ItemForm";
import ImportDialog from "@/components/inventory/ImportDialog";
import StockMovementForm from "@/components/inventory/StockMovementForm";
import MovementsPanel from "@/components/inventory/MovementsPanel";
import MovementReportModal from "@/components/inventory/MovementReportModal";
import { can } from "@/lib/roles";
import { EXPORT_COLUMNS, SOURCE_LABEL, STATUS_LABEL, titleCase } from "@/lib/inventory";
import { exportToExcel } from "@/lib/exportExcel";

const PAGE = 50;
const TRY = ["bearing 6205", "contactor", "rack 32 b", "v-belt", "sensor"];
const KPI = [
  { key: "all", label: "All items", color: "#0284c7" },
  { key: "LOW", label: "Low — reorder", color: "#d97706" },
  { key: "OUT", label: "Out of stock", color: "#dc2626" },
  { key: "OK", label: "In stock", color: "#16a34a" },
];

const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Rack names read "RACK NO. 32 B" but people type "rack 32 b": compare them without the "NO.".
const rackKey = (s) => s.toLowerCase().replace(/\bno\.?(?=\s|$)/g, " ").replace(/[\s.]+/g, " ").trim();

async function fetchItems() {
  const res = await fetch("/api/inventory");
  if (!res.ok) throw new Error("load failed");
  return (await res.json()).items;
}

function Highlight({ text, tokens }) {
  if (!text || !tokens.length) return text;
  const parts = text.split(new RegExp(`(${tokens.map(escapeRe).join("|")})`, "gi"));
  return parts.map((p, i) => (i % 2 ? <mark key={i} className="bg-amber-200 text-inherit rounded-sm px-px">{p}</mark> : p));
}

function Rack({ value, tokens }) {
  return value ? (
    <span className="inline-block font-mono text-[12.5px] font-semibold bg-slate-100 border border-slate-300 rounded-md px-2 py-0.5 whitespace-nowrap">
      <Highlight text={value} tokens={tokens} />
    </span>
  ) : (
    <span className="inline-block text-xs text-slate-400 border border-dashed border-slate-300 rounded-md px-2 py-0.5">Location not set</span>
  );
}

function SourceTag({ source }) {
  return (
    <span className={`text-[10.5px] font-bold tracking-wide rounded px-1.5 py-px ${source === "IMPORTED" ? "bg-violet-100 text-violet-700" : "bg-teal-100 text-teal-700"}`}>
      {SOURCE_LABEL[source].toUpperCase()}
    </span>
  );
}

function Chip({ on, children, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${on ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-sky-500"}`}
      {...props}
    >
      {children}
    </button>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">{label}</span>
      {children}
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [me, setMe] = useState(null);

  const [q, setQ] = useState("");
  const [stock, setStock] = useState("all");
  const [src, setSrc] = useState("all");
  const [dept, setDept] = useState("all");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("name");
  const [dir, setDir] = useState(1);
  const [shown, setShown] = useState(PAGE);

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null); // { item } — item null = add
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [move, setMove] = useState(null); // { kind: "issue" | "topup", preset } — the open issuance / top-up pop-up
  const [movements, setMovements] = useState([]);
  const [report, setReport] = useState(null); // "issue" | "topup" — the open Issuance / Top Up report filters
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const search = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    fetchItems().then(setItems).catch(() => setLoadError(true));
    fetch("/api/me").then((r) => r.json()).then((d) => setMe(d.user)).catch(() => {});
    fetch("/api/inventory/movements").then((r) => (r.ok ? r.json() : { movements: [] })).then((d) => setMovements(d.movements)).catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA") {
        e.preventDefault();
        search.current?.focus();
      }
      if (e.key === "Escape") setSelectedId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!exportMenuOpen) return;
    function onClickOutside(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setExportMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [exportMenuOpen]);

  const canManage = !!me && can(me.role, "invManage");
  const canImport = !!me && can(me.role, "invImport");

  function notify(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  }

  const tokens = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);
  const indexed = useMemo(
    () => (items || []).map((i) => ({ ...i, hay: `${i.name} ${i.location} ${i.dept} ${i.category}`.toLowerCase(), rack: rackKey(i.location) })),
    [items],
  );

  // Everything except the stock filter, so the tile counts always match the rows you'd get.
  const base = useMemo(
    () => indexed.filter((i) => (src === "all" || i.source === src) && (dept === "all" || i.dept === dept) && (cat === "all" || i.category === cat) && tokens.every((t) => i.hay.includes(t))),
    [indexed, src, dept, cat, tokens],
  );
  const counts = useMemo(() => {
    const c = { all: base.length, OK: 0, LOW: 0, OUT: 0 };
    base.forEach((i) => { c[i.status]++; });
    return c;
  }, [base]);

  const results = useMemo(() => {
    const rows = stock === "all" ? [...base] : base.filter((i) => i.status === stock);
    const byName = (a, b) => a.name.localeCompare(b.name);
    const phrase = rackKey(q);
    const score = (i) => {
      const n = i.name.toLowerCase();
      // Items on exactly the rack that was typed come first.
      let s = phrase && i.rack.includes(phrase) ? 50 : 0;
      for (const t of tokens) {
        const at = n.indexOf(t);
        s += at === 0 ? 6 : at > 0 ? (/[\s\-,(/]/.test(n[at - 1]) ? 4 : 2) : 0;
        if (i.location.toLowerCase().includes(t)) s += 1;
      }
      return s;
    };
    const mode = sort === "rel" && !tokens.length ? "name" : sort;
    if (mode === "rel") rows.sort((a, b) => score(b) - score(a) || byName(a, b));
    else if (mode === "name") rows.sort((a, b) => byName(a, b) * dir);
    else if (mode === "loc") rows.sort((a, b) => (a.location || "~").localeCompare(b.location || "~", undefined, { numeric: true }) * dir || byName(a, b));
    else rows.sort((a, b) => (a.balance - b.balance) * dir || byName(a, b));
    return rows;
  }, [base, stock, sort, dir, tokens, q]);

  const depts = useMemo(() => {
    const m = new Map();
    (items || []).forEach((i) => i.dept && m.set(i.dept, (m.get(i.dept) || 0) + 1));
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [items]);
  const categories = useMemo(() => {
    const m = new Map();
    (items || []).forEach((i) => i.category && m.set(i.category, (m.get(i.category) || 0) + 1));
    return [...m].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);
  const lists = useMemo(
    () => ({
      locations: [...new Set((items || []).map((i) => i.location).filter(Boolean))].sort(),
      depts: [...new Set((items || []).map((i) => titleCase(i.dept)).filter(Boolean))].sort(),
      categories: categories.map(([c]) => c),
    }),
    [items, categories],
  );
  // Suggestions for the Top Up report's vendor field — from the movements already
  // loaded for "Recent movements" (the latest ones), not a full history.
  const vendors = useMemo(() => [...new Set(movements.filter((m) => m.kind === "TOPUP").map((m) => m.vendor).filter(Boolean))].sort(), [movements]);

  const selected = items?.find((i) => i.id === selectedId) || null;
  const filtersActive = q || stock !== "all" || src !== "all" || dept !== "all" || cat !== "all";

  function resetAll() {
    setQ(""); setStock("all"); setSrc("all"); setDept("all"); setCat("all"); setSort("name"); setDir(1); setShown(PAGE);
  }
  // Every filter change starts from the top of the list again.
  const on = (setter) => (value) => { setter(value); setShown(PAGE); };
  const setQuery = (v) => { setQ(v); setShown(PAGE); if (v && sort === "name") setSort("rel"); };
  function sortBy(key) {
    if (sort === key) setDir((d) => -d);
    else { setSort(key); setDir(1); }
    setShown(PAGE);
  }

  function onSaved(item, mode) {
    setForm(null);
    setSelectedId(null);
    if (mode === "add") {
      setItems((prev) => [...prev, item]);
      // Show the new spare straight away.
      setQ(item.name); setStock("all"); setSrc("all"); setDept("all"); setCat("all"); setSort("rel"); setShown(PAGE);
      notify(`Added “${item.name}” — showing it now`);
    } else {
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      notify(`Saved “${item.name}”`);
    }
  }

  // An issuance slip or top-up was saved: show the new stock and add it to the movements list.
  function onMoved({ movement, items: updated }, kind) {
    const byId = new Map(updated.map((i) => [i.id, i]));
    setItems((prev) => prev.map((i) => byId.get(i.id) || i));
    setMovements((prev) => [movement, ...prev]);
    setMove(null);
    const n = movement.lines.length;
    notify(kind === "issue" ? `Slip ${movement.slipNo} saved. ${n} ${n === 1 ? "spare" : "spares"} issued and stock updated.` : `Invoice ${movement.invoiceNo} saved. ${n} ${n === 1 ? "spare" : "spares"} added and stock updated.`);
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/inventory/${deleting.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok || res.status === 404) {
      setItems((prev) => prev.filter((i) => i.id !== deleting.id));
      notify(`Deleted “${deleting.name}”`);
      setDeleting(null);
      setSelectedId(null);
    } else {
      notify("Could not delete the spare. Try again.");
    }
  }

  function doExport() {
    const rows = results.map((i) => ({ ...i, list: SOURCE_LABEL[i.source], dept: titleCase(i.dept), statusLabel: STATUS_LABEL[i.status] }));
    exportToExcel(`inventory-${new Date().toISOString().slice(0, 10)}.xlsx`, EXPORT_COLUMNS, rows);
  }

  async function importDone() {
    setImporting(false);
    try {
      setItems(await fetchItems());
      notify("Stock updated");
    } catch {
      notify("Stock updated — reload the page to see it");
    }
  }

  if (loadError) return <EmptyState title="Inventory could not be loaded" body="Reload the page. If it keeps happening, sign out and back in." />;
  if (items === null) return <p className="text-slate-500">Loading…</p>;

  const localCount = items.filter((i) => i.source === "LOCAL").length;
  const topDepts = depts.slice(0, 6);
  const moreDepts = depts.slice(6);
  const arrow = (key) => (sort === key ? (dir > 0 ? " ▲" : " ▼") : "");

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">
            Store stock · {items.length.toLocaleString()} items · {(items.length - localCount).toLocaleString()} imported, {localCount.toLocaleString()} local
          </p>
        </div>
        <div className="flex-1" />
        {canManage && <Btn variant="primary" onClick={() => setForm({ item: null })}>+ Add spare</Btn>}
        {canManage && <Btn className="!border-amber-500 !bg-amber-50 !text-amber-900 hover:!bg-amber-100" onClick={() => setMove({ kind: "issue", preset: null })}>Issuance</Btn>}
        {canManage && <Btn className="!border-emerald-600 !bg-emerald-50 !text-emerald-900 hover:!bg-emerald-100" onClick={() => setMove({ kind: "topup", preset: null })}>Top-up</Btn>}
        {canImport && <Btn onClick={() => setImporting(true)}>Import stock</Btn>}
        <div className="relative inline-flex" ref={exportMenuRef}>
          <Btn onClick={doExport} disabled={results.length === 0} className="!rounded-r-none !border-r-0"><IconDownload /> Export to Excel</Btn>
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={exportMenuOpen}
            aria-label="More export options"
            onClick={() => setExportMenuOpen((o) => !o)}
            className="inline-flex items-center rounded-lg rounded-l-none px-2 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-500"
          >
            <IconChevronDown />
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-sm">
              <div className="px-3 pt-1.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Movement reports</div>
              <button type="button" onClick={() => { setExportMenuOpen(false); setReport("issue"); }} className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-amber-50 text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Issuance…
              </button>
              <button type="button" onClick={() => { setExportMenuOpen(false); setReport("topup"); }} className="w-full flex items-center gap-2 text-left px-3 py-2 hover:bg-emerald-50 text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Top Up…
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KPI.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => on(setStock)(stock === k.key ? "all" : k.key)}
            className={`text-left bg-white rounded-xl border px-4 py-3 relative overflow-hidden ${stock === k.key ? "border-transparent ring-2" : "border-slate-200 hover:border-slate-300"}`}
            style={{ "--tw-ring-color": k.color }}
          >
            <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: k.color }} />
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k.label}</span>
            <span className="block text-2xl font-bold text-slate-900 tabular-nums">{counts[k.key].toLocaleString()}</span>
          </button>
        ))}
      </div>

      <Panel>
        <div className="p-4 pb-0">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              id="inv-search"
              ref={search}
              type="search"
              autoFocus
              autoComplete="off"
              value={q}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a spare — name, part no., rack…"
              className="w-full rounded-xl border-2 border-slate-300 pl-11 pr-12 py-3 text-base focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
            {q ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl leading-none text-slate-400 hover:text-slate-700 px-1">&times;</button>
            ) : (
              <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden sm:block text-xs text-slate-400 border border-slate-200 border-b-2 rounded px-1.5 bg-slate-50">/</kbd>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[12.5px] text-slate-500">
            Try:
            {TRY.map((t) => (
              <button key={t} type="button" onClick={() => setQuery(t)} className="rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-0.5 hover:border-sky-500 hover:text-sky-700">{t}</button>
            ))}
            <span className="text-slate-400">· every word you type must match</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3 border-b border-slate-200">
          <FilterGroup label="Stock">
            {[["all", "All"], ["OK", "In stock"], ["LOW", "Low"], ["OUT", "Out"]].map(([k, l]) => (
              <Chip key={k} on={stock === k} onClick={() => on(setStock)(k)}>{l}</Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="List">
            {[["all", "All"], ["LOCAL", "Local"], ["IMPORTED", "Imported"]].map(([k, l]) => (
              <Chip key={k} on={src === k} onClick={() => on(setSrc)(k)}>{l}</Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Dept">
            <Chip on={dept === "all"} onClick={() => on(setDept)("all")}>All</Chip>
            {topDepts.map(([d, n]) => (
              <Chip key={d} on={dept === d} onClick={() => on(setDept)(d)}>{titleCase(d)} <span className="opacity-60 text-[11.5px]">{n.toLocaleString()}</span></Chip>
            ))}
            {moreDepts.length > 0 && (
              <select
                id="inv-dept-more"
                aria-label="More departments"
                value={moreDepts.some(([d]) => d === dept) ? dept : ""}
                onChange={(e) => e.target.value && on(setDept)(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[13px] max-w-[13rem]"
              >
                <option value="">More departments…</option>
                {moreDepts.map(([d, n]) => <option key={d} value={d}>{titleCase(d)} ({n})</option>)}
              </select>
            )}
          </FilterGroup>
          <FilterGroup label="Category">
            <select id="inv-category-filter" aria-label="Category" value={cat} onChange={(e) => on(setCat)(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[13px] max-w-[13rem]">
              <option value="all">All categories</option>
              {categories.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
            </select>
          </FilterGroup>
          {filtersActive && <button type="button" onClick={resetAll} className="ml-auto text-sm text-sky-700 hover:underline">Clear all filters</button>}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-2.5 border-b border-slate-200 text-sm text-slate-500">
          <span>
            {results.length ? (<><b className="text-slate-800">{Math.min(shown, results.length).toLocaleString()}</b> of <b className="text-slate-800">{results.length.toLocaleString()}</b> items</>) : "No items"}
            <span className="text-slate-400"> · click a row for details</span>
          </span>
          <label className="flex items-center gap-1.5 text-xs">
            Sort by
            <select
              id="inv-sort"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setDir(1); setShown(PAGE); }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-700"
            >
              <option value="rel">Best match</option>
              <option value="name">Name A–Z</option>
              <option value="loc">Location</option>
              <option value="bal">Stock: low → high</option>
            </select>
          </label>
        </div>

        {results.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <p className="font-medium text-slate-800 mb-1">Nothing found{q ? ` for “${q}”` : ""}</p>
            <p className="text-sm">Try fewer words, check the spelling, or <button type="button" onClick={resetAll} className="text-sky-700 hover:underline">clear all filters</button>.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 select-none">
                  <th className="px-4 py-2.5 cursor-pointer hover:text-slate-800" onClick={() => sortBy("name")}>Item{arrow("name")}</th>
                  <th className="px-4 py-2.5 cursor-pointer hover:text-slate-800 hidden sm:table-cell" onClick={() => sortBy("loc")}>Where to find it{arrow("loc")}</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Category</th>
                  <th className="px-4 py-2.5 text-right cursor-pointer hover:text-slate-800" onClick={() => sortBy("bal")}>In stock{arrow("bal")}</th>
                  <th className="px-4 py-2.5 text-right hidden md:table-cell">Reorder at</th>
                  {canManage && <th className="px-2 py-2.5 w-px"><span className="sr-only">Edit</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.slice(0, shown).map((i) => (
                  <tr key={i.id} onClick={() => setSelectedId(i.id)} className="cursor-pointer hover:bg-slate-50 align-top">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900 [overflow-wrap:anywhere]"><Highlight text={i.name} tokens={tokens} /></div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-xs text-slate-500">
                        <SourceTag source={i.source} />
                        <span>{titleCase(i.dept)}</span>
                        <span className="sm:hidden"><Rack value={i.location} tokens={tokens} /></span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell"><Rack value={i.location} tokens={tokens} /></td>
                    <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell">{i.category || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="text-lg font-bold leading-tight tabular-nums">{fmt(i.balance)}</div>
                      <StockPill status={i.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-500 tabular-nums hidden md:table-cell">{i.reorderLevel ? fmt(i.reorderLevel) : "—"}</td>
                    {canManage && (
                      <td className="px-2 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setMove({ kind: "issue", preset: i })} className="rounded-md border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold px-2 h-7">Issue</button>
                          <button type="button" onClick={() => setMove({ kind: "topup", preset: i })} className="rounded-md border border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold px-2 h-7">Top-up</button>
                          <IconBtn title="Edit spare" onClick={() => setForm({ item: i })}><IconEdit /></IconBtn>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {results.length > shown && (
          <div className="flex justify-center p-4">
            <Btn onClick={() => setShown((s) => s + PAGE)}>
              Show {Math.min(PAGE, results.length - shown)} more <span className="text-slate-400">({(results.length - shown).toLocaleString()} left)</span>
            </Btn>
          </div>
        )}
      </Panel>

      <MovementsPanel movements={movements} />

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/45" onClick={() => setSelectedId(null)} />
          <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[27.5rem] bg-white shadow-2xl flex flex-col" aria-label="Spare details">
            <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 [overflow-wrap:anywhere]">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1.5"><SourceTag source={selected.source} /><StockPill status={selected.status} /></div>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Close" className="ml-auto text-2xl leading-none text-slate-400 hover:text-slate-700">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <div className="flex items-center gap-3 rounded-xl border-2 border-slate-900 px-4 py-3 mb-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Where to find it</div>
                  <div className="font-mono text-xl font-bold [overflow-wrap:anywhere]">{selected.location || "Location not set"}</div>
                </div>
                {selected.location && (
                  <Btn className="ml-auto" onClick={() => { navigator.clipboard?.writeText(selected.location); notify("Location copied"); }}>Copy</Btn>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center mb-4">
                {[["Opening", selected.opening], ["+ Received", selected.received], ["− Issued", selected.issued]].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-slate-50 border border-slate-200 py-2">
                    <div className="text-[10.5px] uppercase tracking-wide text-slate-500">{l}</div>
                    <div className="text-lg font-bold tabular-nums">{fmt(v)}</div>
                  </div>
                ))}
                <div className="rounded-lg bg-slate-900 text-white py-2">
                  <div className="text-[10.5px] uppercase tracking-wide text-slate-300">= Balance</div>
                  <div className="text-lg font-bold tabular-nums">{fmt(selected.balance)}</div>
                </div>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500">Reorder level</dt><dd className="text-right font-medium">{selected.reorderLevel ? fmt(selected.reorderLevel) : "Not set"}</dd>
                <dt className="text-slate-500">Department</dt><dd className="text-right font-medium">{titleCase(selected.dept) || "—"}</dd>
                <dt className="text-slate-500">Category</dt><dd className="text-right font-medium">{selected.category || "—"}</dd>
                {selected.fsn && (<><dt className="text-slate-500">Movement</dt><dd className="text-right font-medium">{selected.fsn}</dd></>)}
                {selected.fsn && (<><dt className="text-slate-500">Avg. issued / month</dt><dd className="text-right font-medium">{fmt(selected.avgMonthly)}</dd></>)}
              </dl>
              <p className="mt-5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500">
                {canManage ? "Changes to a spare are saved straight away. Import stock shows a preview first." : "Read-only for your role."}
              </p>
            </div>
            {canManage && (
              <div className="flex gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
                <Btn variant="danger" onClick={() => { setSelectedId(null); setDeleting(selected); }}>Delete</Btn>
                <div className="flex-1" />
                <Btn variant="primary" onClick={() => { setSelectedId(null); setForm({ item: selected }); }}>Edit spare</Btn>
              </div>
            )}
          </aside>
        </>
      )}

      {form && <ItemForm item={form.item} lists={lists} onClose={() => setForm(null)} onSaved={onSaved} />}

      {deleting && (
        <Modal title="Delete this spare?" onClose={() => setDeleting(null)}>
          <div className="p-4 space-y-3 text-sm">
            <p><b className="text-slate-900">{deleting.name}</b>{deleting.location ? <> · <Rack value={deleting.location} tokens={[]} /></> : null}</p>
            <p className="text-slate-600">
              It has <b>{fmt(deleting.balance)}</b> in stock. Deleting removes it from the store list for everyone. This can&rsquo;t be undone — to keep the record, set its stock to 0 instead.
            </p>
          </div>
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
            <Btn onClick={() => setDeleting(null)}>Keep it</Btn>
            <Btn className="!bg-red-600 !border-red-600 !text-white hover:!bg-red-700" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete spare"}</Btn>
          </div>
        </Modal>
      )}

      {move && <StockMovementForm kind={move.kind} items={items} preset={move.preset} lists={lists} onClose={() => setMove(null)} onSaved={onMoved} />}

      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={importDone} />}

      {report && <MovementReportModal kind={report} items={items} vendors={vendors} onClose={() => setReport(null)} />}

      {toast && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[60] max-w-[92vw] rounded-lg bg-slate-900 text-white text-sm px-4 py-2.5 shadow-lg">{toast}</div>
      )}
    </div>
  );
}
