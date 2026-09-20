import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { can, ROLES } from "@/lib/roles";
import { getNotificationByNo, setNotificationStatus, updateNotification, deleteNotification, findUserByUsername } from "@/lib/store";
import { isUiOnlyMode } from "@/lib/mode";
import { PRIORITIES, NT_STATUSES } from "@/lib/constants";

const ALLOWED = ["Under Review", "Accepted", "Rejected"];
const LOCKED = ["Converted to Work Order", "Closed"];

async function sessionUserName(session) {
  if (isUiOnlyMode()) return session.name;
  return (await findUserByUsername(session.username))?.name || session.username;
}

export async function GET(request, { params }) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const notification = await getNotificationByNo(id);
  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ notification });
}

export async function PATCH(request, { params }) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Review flow: Under Review / Accepted / Rejected — engineering only.
  if (body?.status !== undefined) {
    if (!can(auth.session.role, "review")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!ALLOWED.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const who = await sessionUserName(auth.session);
    try {
      const notification = await setNotificationStatus(id, body.status, who);
      return NextResponse.json({ notification });
    } catch (e) {
      console.error("PATCH /api/notifications/[id] failed:", e);
      return NextResponse.json({ error: "Could not update notification" }, { status: 500 });
    }
  }

  // Admin full edit of every field, whatever the status.
  if (body?.edit) {
    if (!can(auth.session.role, "manageAll")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const f = body.edit;
    for (const k of ["dept", "location", "job", "description", "nature"]) {
      if (!String(f[k] ?? "").trim()) return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!PRIORITIES.includes(f.priority)) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    if (!NT_STATUSES.includes(f.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    try {
      const notification = await updateNotification(id, f, await sessionUserName(auth.session));
      return NextResponse.json({ notification });
    } catch (e) {
      console.error("PATCH /api/notifications/[id] edit failed:", e);
      return NextResponse.json({ error: "Could not update notification" }, { status: 500 });
    }
  }

  // Quick edit flow: job / priority only — the person who raised it, or Administration.
  const existing = await getNotificationByNo(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const who = await sessionUserName(auth.session);
  const isOwner = existing.raisedByName === who;
  if (auth.session.role !== ROLES.ADMIN && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (LOCKED.includes(existing.status)) {
    return NextResponse.json({ error: "This notification is locked — it has already been converted to a work order or closed." }, { status: 400 });
  }

  const patch = {};
  if (typeof body.job === "string" && body.job.trim()) patch.job = body.job.trim();
  if (typeof body.priority === "string") patch.priority = body.priority;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  try {
    const notification = await updateNotification(id, patch, who);
    return NextResponse.json({ notification });
  } catch (e) {
    console.error("PATCH /api/notifications/[id] failed:", e);
    return NextResponse.json({ error: "Could not update notification" }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] -> remove a notification and any work order
// raised from it. Administration can remove one at any status; the person
// who raised it can only remove their own before it's converted or closed.
export async function DELETE(request, { params }) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const existing = await getNotificationByNo(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const who = await sessionUserName(auth.session);
  const isAdmin = auth.session.role === ROLES.ADMIN;
  const isOwner = existing.raisedByName === who;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isAdmin && LOCKED.includes(existing.status)) {
    return NextResponse.json({ error: "This notification is locked — it has already been converted to a work order or closed." }, { status: 400 });
  }

  try {
    await deleteNotification(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/notifications/[id] failed:", e);
    return NextResponse.json({ error: "Could not remove notification" }, { status: 500 });
  }
}
