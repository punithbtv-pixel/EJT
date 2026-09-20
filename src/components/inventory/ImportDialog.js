"use client";

import { useRef, useState } from "react";
import { Modal, Btn } from "@/components/ui";
import { parseInventoryFile } from "@/lib/inventoryParse";
import { SOURCE_LABEL } from "@/lib/inventory";

const fmt = (v) => (typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v || "—");

function Steps({ step }) {
  const items = ["Choose file", "Review changes", "Done"];
  return (
    <div className="flex gap-1.5 text-xs">
      {items.map((label, i) => (
        <span
          key={label}
          className={`rounded-full px-2.5 py-1 ${i + 1 === step ? "bg-sky-600 text-white" : i + 1 < step ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}
        >
          {i + 1}. {label}
        </span>
      ))}
    </div>
  );
}

function Tile({ label, value, tone }) {
  const color = tone === "new" ? "text-green-700" : tone === "upd" ? "text-sky-700" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}

// Choose a workbook → preview exactly what would change → apply. Nothing is
// saved until the last step, and items missing from the file are never deleted.
export default function ImportDialog({ onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState("");
  const [parsed, setParsed] = useState(null);
  const [plan, setPlan] = useState(null);
  const [result, setResult] = useState(null);
  const input = useRef(null);

  async function choose(f) {
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      const mod = await import("xlsx");
      const p = parseInventoryFile(mod.default ?? mod, await f.arrayBuffer(), "array");
      if (!p.rows.length) {
        setError(p.warnings[0] || "No stock rows found. Use a store workbook with a “Net stock” sheet, or a file exported from Inventory.");
        return;
      }
      const res = await fetch("/api/inventory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: p.rows, apply: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not check the file against the current stock.");
        return;
      }
      setFile(f.name);
      setParsed(p);
      setPlan(data);
      setStep(2);
    } catch {
      setError("Could not read that file. Choose an Excel (.xlsx) or CSV stock file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function apply() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/inventory/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: parsed.rows, apply: true }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setResult(data);
      setStep(3);
    } else {
      setError(data.error || "Could not save the changes. Nothing was changed.");
    }
  }

  const changes = plan ? plan.counts.added + plan.counts.updated : 0;

  return (
    <Modal title="Import stock" onClose={busy ? () => {} : step === 3 ? onDone : onClose} wide="xl">
      <div className="px-4 pt-3 flex justify-end"><Steps step={step} /></div>

      {step === 1 && (
        <div className="p-4">
          <div
            className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files?.[0]); }}
          >
            <p className="font-semibold text-slate-800">Drop your stock workbook here</p>
            <p className="text-sm text-slate-500 mt-1 mb-4">Excel (.xlsx) or CSV — your store workbooks, or a file exported from this page.</p>
            <Btn variant="primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Reading file…" : "Choose file…"}</Btn>
            <input id="inv-import-file" ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => choose(e.target.files?.[0])} />
          </div>
          {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
          <ul className="mt-4 list-disc pl-5 space-y-1 text-sm text-slate-600">
            <li>The <b>Net stock</b> sheet is found automatically — both the “IMPORTED ITEMS” and “LOCAL ITEMS” layouts work.</li>
            <li>Items are matched by <b>name</b>: matches are updated, new names are added.</li>
            <li>Items that are <b>not</b> in the file are left as they are — an import never deletes anything.</li>
            <li>A blank location, department or category in the file never overwrites what is already saved.</li>
            <li><b>Nothing is saved yet.</b> You will see every change first and confirm it.</li>
          </ul>
        </div>
      )}

      {step === 2 && plan && (
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-500">
            File <b className="text-slate-800">{file}</b> · {parsed.sheets.map((s) => `“${s}”`).join(", ")} · {parsed.rows.length.toLocaleString()} items read
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile label="New items" value={plan.counts.added} tone="new" />
            <Tile label="Updated" value={plan.counts.updated} tone="upd" />
            <Tile label="Unchanged" value={plan.counts.unchanged} />
            <Tile label="Not in file (kept)" value={plan.counts.notInFile} />
          </div>

          {changes === 0 ? (
            <p className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-6 text-center text-sm text-slate-600">
              Nothing to change — this file matches the stock that is already saved.
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200 overflow-auto max-h-[46vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">Change</th><th className="px-3 py-2">Item</th><th className="px-3 py-2">What changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plan.added.map((a, i) => (
                    <tr key={`a${i}`}>
                      <td className="px-3 py-2 align-top"><span className="rounded bg-green-100 text-green-700 text-[11px] font-bold px-1.5 py-0.5">NEW</span></td>
                      <td className="px-3 py-2">{a.name}<div className="text-xs text-slate-500">{SOURCE_LABEL[a.source]}{a.location ? ` · ${a.location}` : ""}</div></td>
                      <td className="px-3 py-2 font-mono text-xs">{fmt(a.balance)} in stock</td>
                    </tr>
                  ))}
                  {plan.updated.map((u) => (
                    <tr key={`u${u.id}`}>
                      <td className="px-3 py-2 align-top"><span className="rounded bg-sky-100 text-sky-700 text-[11px] font-bold px-1.5 py-0.5">UPDATE</span></td>
                      <td className="px-3 py-2">{u.name}<div className="text-xs text-slate-500">{SOURCE_LABEL[u.source]}{u.location ? ` · ${u.location}` : ""}</div></td>
                      <td className="px-3 py-2 font-mono text-xs space-y-0.5">
                        {u.changes.map((c) => (
                          <div key={c.field}>{c.label}: <s className="text-slate-400">{fmt(c.from)}</s> → <b>{fmt(c.to)}</b></div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(plan.counts.added > plan.added.length || plan.counts.updated > plan.updated.length) && (
                <p className="px-3 py-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
                  Showing the first {plan.added.length + plan.updated.length} of {changes.toLocaleString()} changes. All of them will be saved.
                </p>
              )}
            </div>
          )}

          {(parsed.skipped.length > 0 || parsed.warnings.length > 0 || plan.counts.rejected > 0 || plan.counts.duplicates > 0) && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm px-3 py-2 space-y-1">
              {parsed.skipped.length > 0 && (
                <p>
                  <b>{parsed.skipped.length} row{parsed.skipped.length === 1 ? "" : "s"} skipped</b> —{" "}
                  {parsed.skipped.slice(0, 4).map((s) => `${s.sheet} row ${s.row} (${s.reason})`).join("; ")}
                  {parsed.skipped.length > 4 ? "…" : ""}
                </p>
              )}
              {parsed.warnings.map((w) => <p key={w}>{w}</p>)}
              {plan.counts.rejected > 0 && <p><b>{plan.counts.rejected} rows rejected</b> — {plan.rejected.map((r) => r.reason).slice(0, 3).join("; ")}</p>}
            </div>
          )}
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>
      )}

      {step === 3 && result && (
        <div className="p-6 text-center space-y-2">
          <p className="text-lg font-semibold text-slate-900">Stock updated</p>
          <p className="text-sm text-slate-600">
            {result.added.toLocaleString()} added · {result.updated.toLocaleString()} updated · {result.unchanged.toLocaleString()} unchanged
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
        {step === 2 && (
          <span className="mr-auto text-xs text-slate-500">
            {changes ? `${changes.toLocaleString()} change${changes === 1 ? "" : "s"} will be saved. Nothing has been saved yet.` : "Nothing will be saved."}
          </span>
        )}
        {step === 3 ? (
          <Btn variant="primary" onClick={onDone}>Done</Btn>
        ) : (
          <>
            <Btn onClick={onClose} disabled={busy}>{step === 2 ? "Cancel — change nothing" : "Cancel"}</Btn>
            {step === 2 && <Btn variant="primary" disabled={busy || changes === 0} onClick={apply}>{busy ? "Saving…" : `Apply ${changes.toLocaleString()} change${changes === 1 ? "" : "s"}`}</Btn>}
          </>
        )}
      </div>
    </Modal>
  );
}
