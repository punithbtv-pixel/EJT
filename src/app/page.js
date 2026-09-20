"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { Panel, EmptyState, StatusPill } from "@/components/ui";
import { fmtD, fmtDT } from "@/lib/format";
import { WO_OPEN, WO_STATUSES, WO_STATUS_COLOR } from "@/lib/constants";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Kpi({ label, value, note, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 relative overflow-hidden">
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-3xl font-bold text-slate-900 mt-1">{value}</div>
      {note && <div className="text-xs text-slate-500 mt-1">{note}</div>}
    </div>
  );
}

function lastMonths(n, today) {
  const out = [];
  const base = new Date(`${today}T00:00:00`);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push({ ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MON[d.getMonth()] });
  }
  return out;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ notifications: [], workOrders: [], open: [] }));
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const { notifications: ns, workOrders: ws } = data;
    const today = ns[0]?.date || new Date().toISOString().slice(0, 10);
    const thisYM = today.slice(0, 7);
    const nMonth = ns.filter((n) => n.date.slice(0, 7) === thisYM);
    const wMonth = ws.filter((w) => (w.createdAt || "").slice(0, 7) === thisYM);
    const open = ws.filter((w) => WO_OPEN.includes(w.status));
    const doneMonth = ws.filter((w) => ["Completed", "Closed"].includes(w.status) && (w.actualEnd || "").slice(0, 7) === thisYM);
    const unconv = ns.filter((n) => ["Raised", "Under Review", "Accepted"].includes(n.status));
    const critOpen = open.filter((w) => w.priority === "Critical").length;
    const convRate = nMonth.length ? Math.round((nMonth.filter((n) => n.workOrderNo).length / nMonth.length) * 100) : 0;

    const months = lastMonths(6, today);
    const monthly = months.map((m) => ({
      month: m.label,
      Notifications: ns.filter((n) => n.date.slice(0, 7) === m.ym).length,
      "Work Orders": ws.filter((w) => (w.createdAt || "").slice(0, 7) === m.ym).length,
    }));

    const statusCounts = WO_STATUSES.map((s) => ({ status: s, count: ws.filter((w) => w.status === s).length })).filter((x) => x.count);

    const now = `${today} 23:59`;
    const attention = [
      ...open.filter((w) => w.plannedEnd < now).map((w) => ({ kind: "wo", no: w.no, title: `${w.no} · ${w.job}`, meta: `Planned end ${fmtDT(w.plannedEnd)} has passed — ${w.status.toLowerCase()}` })),
      ...open.filter((w) => w.priority === "Critical" && w.plannedEnd >= now).map((w) => ({ kind: "wo", no: w.no, title: `${w.no} · ${w.job}`, meta: `Critical priority · ${w.status}` })),
      ...ns.filter((n) => n.status === "Raised").map((n) => ({ kind: "nt", no: n.no, title: `${n.no} · ${n.job}`, meta: `Raised ${fmtD(n.date)} — not yet reviewed` })),
      ...ws.filter((w) => w.status === "Completed").map((w) => ({ kind: "wo", no: w.no, title: `${w.no} · ${w.job}`, meta: "Completed — awaiting verification and closure" })),
    ].slice(0, 8);

    return { nMonth, wMonth, open, doneMonth, unconv, critOpen, convRate, monthly, statusCounts, attention };
  }, [data]);

  if (!data) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Engineering Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Notifications this month" value={stats.nMonth.length} note={`${stats.unconv.length} not yet converted`} color="#3b82f6" />
        <Kpi label="Work orders this month" value={stats.wMonth.length} note={`${stats.convRate}% of this month's notifications`} color="#f97316" />
        <Kpi label="Pending work orders" value={stats.open.length} note={`${stats.critOpen} at critical priority`} color="#f59e0b" />
        <Kpi label="Completed this month" value={stats.doneMonth.length} note="Work finished and reported" color="#16a34a" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Monthly engineering activity" sub="Last 6 months">
          <div className="p-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Notifications" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Work Orders" fill="#f97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Work order status" sub={`${data.workOrders.length} work orders`}>
          <div className="p-4">
            {stats.statusCounts.length ? (
              <div className="space-y-2.5">
                {stats.statusCounts.map((s) => (
                  <Link key={s.status} href={`/workorders?status=${encodeURIComponent(s.status)}`} className="flex items-center gap-3 group">
                    <span className="w-36 text-sm text-slate-600 group-hover:text-slate-900">{s.status}</span>
                    <span className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${(s.count / data.workOrders.length) * 100}%`, background: WO_STATUS_COLOR[s.status] }}
                      />
                    </span>
                    <span className="text-sm font-medium text-slate-700 w-6 text-right">{s.count}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No work orders yet" />
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Needs attention" sub={`${stats.attention.length} item${stats.attention.length === 1 ? "" : "s"}`}>
        {stats.attention.length ? (
          <div className="divide-y divide-slate-100">
            {stats.attention.map((a) => (
              <Link
                key={`${a.kind}-${a.no}`}
                href={a.kind === "wo" ? `/workorders/${a.no}` : `/notifications/${a.no}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 truncate">{a.title}</div>
                  <div className="text-xs text-slate-500 truncate">{a.meta}</div>
                </div>
                <span className="text-slate-400">&rarr;</span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="All clear" body="No overdue, critical or unreviewed items in your view." />
        )}
      </Panel>
    </div>
  );
}
