"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Btn, Field, inputClass } from "@/components/ui";
import LocationFilterPicker, { emptyLocationFilter } from "@/components/inventory/LocationFilterPicker";
import { composeLocation } from "@/lib/locationTree";
import { exportToExcel } from "@/lib/exportExcel";
import { fmtDT } from "@/lib/format";

const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const SHOWN_MAX = 300; // the table previews this many rows; Export downloads every matching row

const ISSUE_COLUMNS = [
  { key: "date", header: "Date & time" },
  { key: "slipNo", header: "Slip No." },
  { key: "spare", header: "Spare" },
  { key: "qty", header: "Qty Issued" },
  { key: "issuedTo", header: "Issued To" },
  { key: "dept", header: "Department" },
  { key: "issuedBy", header: "Issued By" },
  { key: "authorisedBy", header: "Authorised By" },
  { key: "location", header: "Where Used" },
];
const TOPUP_COLUMNS = [
  { key: "date", header: "Date & time" },
  { key: "invoiceNo", header: "Invoice No." },
  { key: "spare", header: "Spare" },
  { key: "qty", header: "Qty Received" },
  { key: "vendor", header: "Vendor" },
];

// Export to Excel ▾ → Issuance / Top Up. Filters a report of movement records
// live and shows the matching rows before anything downloads.
export default function MovementReportModal({ kind, items, vendors, onClose }) {
  const issue = kind === "issue";
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [spare, setSpare] = useState("");
  const [slipNo, setSlipNo] = useState("");
  const [dept, setDept] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [vendor, setVendor] = useState("");
  const [loc, setLoc] = useState(emptyLocationFilter);
  const [depts, setDepts] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!issue) return;
    fetch("/api/departments")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setDepts((d?.departments || []).filter((x) => x.active).map((x) => x.name)))
      .catch(() => {});
  }, [issue]);

  useEffect(() => {
    const params = new URLSearchParams({ kind: issue ? "ISSUE" : "TOPUP", from, to, spare });
    if (issue) {
      if (slipNo) params.set("slipNo", slipNo);
      if (dept) params.set("dept", dept);
      if (issuedTo) params.set("issuedTo", issuedTo);
      const composed = composeLocation(loc);
      if (composed) params.set("location", composed);
    } else if (vendor) {
      params.set("vendor", vendor);
    }

    let live = true;
    const timer = setTimeout(() => {
      if (!live) return;
      setLoading(true);
      fetch(`/api/inventory/movements/report?${params}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => { if (live) { setRows(d.rows); setError(""); } })
        .catch(() => { if (live) setError("Could not load the report. Check your connection and try again."); })
        .finally(() => { if (live) setLoading(false); });
    }, 300);
    return () => { live = false; clearTimeout(timer); };
  }, [issue, from, to, spare, slipNo, dept, issuedTo, vendor, loc]);

  const columns = issue ? ISSUE_COLUMNS : TOPUP_COLUMNS;
  const exportRows = useMemo(() => rows.map((r) => ({ ...r, date: fmtDT(r.when) })), [rows]);

  function resetFilters() {
    setSpare(""); setSlipNo(""); setDept(""); setIssuedTo(""); setVendor(""); setLoc(emptyLocationFilter);
  }

  function doExport() {
    if (!rows.length) return;
    exportToExcel(`${issue ? "issuance" : "topup"}-${from}-to-${to}.xlsx`, columns, exportRows);
    onClose();
  }

  return (
    <Modal title={`Export ${issue ? "issuance" : "top up"} report`} onClose={onClose} wide="xl">
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="From date">
          <input id="rf-from" className={inputClass} type="date" value={from} max={today()} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To date">
          <input id="rf-to" className={inputClass} type="date" value={to} max={today()} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Spare" wide>
          <input id="rf-spare" className={inputClass} list="rf-dl-spare" placeholder="All spares" value={spare} onChange={(e) => setSpare(e.target.value)} />
        </Field>

        {issue ? (
          <Field label="Issue slip no.">
            <input id="rf-slip" className={`${inputClass} font-mono`} placeholder="e.g. IS-2026-04" value={slipNo} onChange={(e) => setSlipNo(e.target.value)} />
          </Field>
        ) : (
          <Field label="Vendor">
            <input id="rf-vendor" className={inputClass} list="rf-dl-vendor" placeholder="All vendors" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </Field>
        )}

        {issue && (
          <div className="sm:col-span-2"><LocationFilterPicker value={loc} onChange={setLoc} /></div>
        )}
        {issue && (
          <Field label="Department">
            <select id="rf-dept" className={inputClass} value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="">All departments</option>
              {depts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
        )}
        {issue && (
          <Field label="Issued to">
            <input id="rf-to-person" className={inputClass} placeholder="All" value={issuedTo} onChange={(e) => setIssuedTo(e.target.value)} />
          </Field>
        )}
      </div>

      <datalist id="rf-dl-spare">{items.map((i) => <option key={i.id} value={i.name} />)}</datalist>
      <datalist id="rf-dl-vendor">{vendors.map((v) => <option key={v} value={v} />)}</datalist>

      <div className="px-4 pb-2 flex items-center gap-2 text-sm text-slate-500">
        <span>
          {loading ? "Loading…" : error ? <span className="text-red-600">{error}</span> : rows.length ? <><b className="text-slate-800">{rows.length}</b> {rows.length === 1 ? "row" : "rows"} match</> : "No rows match these filters"}
        </span>
        <span className="flex-1" />
        <button type="button" onClick={resetFilters} className="text-sky-700 hover:underline">Clear filters</button>
      </div>

      <div className="border-t border-slate-200 overflow-x-auto max-h-64">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 select-none">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">{issue ? "Slip no." : "Invoice no."}</th>
              <th className="px-4 py-2">Spare</th>
              <th className="px-4 py-2 text-right">{issue ? "Qty issued" : "Qty received"}</th>
              {issue ? (
                <>
                  <th className="px-4 py-2 hidden md:table-cell">Issued to</th>
                  <th className="px-4 py-2 hidden lg:table-cell">Where used</th>
                </>
              ) : (
                <th className="px-4 py-2 hidden md:table-cell">Vendor</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={issue ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                {loading ? "Loading…" : `No ${issue ? "issuance slips" : "top-ups"} match these filters. Try widening the date range or clearing a filter.`}
              </td></tr>
            ) : rows.slice(0, SHOWN_MAX).map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{fmtDT(r.when)}</td>
                <td className="px-4 py-2 font-mono text-xs">{issue ? r.slipNo : r.invoiceNo}</td>
                <td className="px-4 py-2 font-medium text-slate-900 [overflow-wrap:anywhere]">{r.spare}</td>
                <td className={`px-4 py-2 text-right tabular-nums ${issue ? "text-amber-700" : "text-emerald-700"}`}>{issue ? "−" : "+"}{fmt(r.qty)}</td>
                {issue ? (
                  <>
                    <td className="px-4 py-2 hidden md:table-cell">{r.issuedTo} <span className="text-slate-400">({r.dept})</span></td>
                    <td className="px-4 py-2 hidden lg:table-cell text-xs text-slate-500 [overflow-wrap:anywhere]">{r.location}</td>
                  </>
                ) : (
                  <td className="px-4 py-2 hidden md:table-cell">{r.vendor}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > SHOWN_MAX && (
        <p className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">
          Showing the first {SHOWN_MAX} of {rows.length} matching rows — the download includes all of them.
        </p>
      )}

      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
        <span className="mr-auto text-xs text-slate-500">Downloads an .xlsx with one row per spare, matching the filters above.</span>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn
          onClick={doExport}
          disabled={rows.length === 0}
          className={issue ? "!bg-amber-600 hover:!bg-amber-700 !text-white" : "!bg-emerald-600 hover:!bg-emerald-700 !text-white"}
        >
          Export to Excel
        </Btn>
      </div>
    </Modal>
  );
}
