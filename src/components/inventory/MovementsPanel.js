"use client";

import { useState } from "react";
import { Panel, Btn } from "@/components/ui";

const PAGE = 8;
const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const when = (iso) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// The latest issuance slips and top-ups, newest first.
export default function MovementsPanel({ movements }) {
  const [shown, setShown] = useState(PAGE);

  return (
    <Panel title="Recent movements" sub="Every issuance slip and top-up is kept as a record, newest first.">
      {movements.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">Nothing issued or topped up yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm">
          {movements.slice(0, shown).map((m) => {
            const issue = m.kind === "ISSUE";
            return (
              <li key={m.id} className="flex gap-3 px-4 py-3">
                <span className={`mt-0.5 h-6 shrink-0 rounded-full text-[11px] font-bold px-2 inline-flex items-center ${issue ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {issue ? "ISSUED" : "TOP-UP"}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {issue && <span className="font-mono text-[12.5px] font-semibold bg-slate-100 border border-slate-300 rounded-md px-1.5 py-px">{m.slipNo}</span>}
                    <span className="text-xs text-slate-500">{when(m.when)}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {m.lines.map((l, i) => (
                      <li key={i} className="font-medium text-slate-900 [overflow-wrap:anywhere]">
                        {l.name} <span className={`tabular-nums ${issue ? "text-amber-700" : "text-emerald-700"}`}>{issue ? "−" : "+"}{fmt(l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  {issue ? (
                    <>
                      <div className="mt-1 text-xs text-slate-500">by {m.issuedBy} to {m.issuedTo} ({m.dept}) · authorised by {m.authorisedBy}</div>
                      <div className="text-xs text-slate-400 [overflow-wrap:anywhere]">{m.location}</div>
                    </>
                  ) : (
                    <div className="mt-1 text-xs text-slate-500">from {m.vendor} · invoice {m.invoiceNo}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {movements.length > shown && (
        <div className="flex justify-center p-4 border-t border-slate-100">
          <Btn onClick={() => setShown((s) => s + PAGE)}>Show {Math.min(PAGE, movements.length - shown)} more</Btn>
        </div>
      )}
    </Panel>
  );
}
