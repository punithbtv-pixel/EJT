"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Panel, EmptyState, StatusPill, PriorityTag, Btn } from "@/components/ui";
import { fmtD, fmtDT } from "@/lib/format";

function Timeline({ items }) {
  return (
    <div className="space-y-0">
      {items.map((h, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500 mt-1.5" />
            {i < items.length - 1 && <span className="w-px flex-1 bg-slate-200" />}
          </div>
          <div className="pb-4 min-w-0">
            <div className="text-sm text-slate-800">{h.text}</div>
            <div className="text-xs text-slate-500 font-mono">{fmtDT(h.at)} · {h.who || "System"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationDetailPage({ params }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [n, setN] = useState(null);
  const [me, setMe] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/notifications/${id}`);
    if (res.ok) setN((await res.json()).notification);
    else setN(false);
  }

  useEffect(() => {
    load();
    fetch("/api/me").then((r) => r.json()).then((d) => setMe(d.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function setStatus(status) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) load();
    else setError((await res.json().catch(() => ({}))).error || "Could not update the notification.");
  }

  if (n === null) return <p className="text-slate-500">Loading…</p>;
  if (n === false) return <EmptyState title="Notification not found" body="It may be outside your access scope." />;

  const canReview = me && ["ADMIN", "ENGINEER"].includes(me.role) && !["Rejected", "Closed"].includes(n.status);
  const canConvert = canReview && !n.workOrderNo;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="p-4 flex flex-wrap gap-4 items-start">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs text-sky-600 font-semibold">{n.no}</div>
            <h1 className="text-lg font-semibold text-slate-900 mt-1">{n.job}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Raised by {n.raisedByName} · {fmtD(n.date)} at {n.time} · {n.dept} &rsaquo; {n.location}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <StatusPill status={n.status} />
              <PriorityTag priority={n.priority} />
              <span className="text-xs text-slate-500">{n.nature}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReview && n.status === "Raised" && <Btn disabled={busy} onClick={() => setStatus("Under Review")}>Mark under review</Btn>}
            {canReview && ["Raised", "Under Review"].includes(n.status) && <Btn disabled={busy} onClick={() => setStatus("Accepted")}>Accept</Btn>}
            {canReview && ["Raised", "Under Review"].includes(n.status) && <Btn variant="danger" disabled={busy} onClick={() => setStatus("Rejected")}>Reject</Btn>}
            {canConvert && <Btn variant="primary" onClick={() => router.push(`/workorders/new?from=${n.no}`)}>Convert to work order</Btn>}
            {n.workOrderNo && <Btn onClick={() => router.push(`/workorders/${n.workOrderNo}`)}>Open {n.workOrderNo}</Btn>}
          </div>
        </div>
        {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Problem description">
          <div className="p-4">
            <p className="text-sm text-slate-700 leading-relaxed">{n.description}</p>
          </div>
        </Panel>
        <Panel title="Activity history" sub={`${n.history.length} entries`}>
          <div className="p-4">
            <Timeline items={n.history} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
