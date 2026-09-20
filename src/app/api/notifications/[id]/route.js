import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { can } from "@/lib/roles";
import { getNotificationByNo, setNotificationStatus, updateNotification, deleteNotification, findUserByUsername } from "@/lib/store";
import { isUiOnlyMode } from "@/lib/mode";
import { PRIORITIES, NT_STATUSES } from "@/lib/constants";

const ALLOWED = ["Under Review", "Accepted", "Rejected"];

export async function GET(request, { params }) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const notification = await getNotificationByNo(id);
  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ notification });
}

async function actorName(session) {
  if (isUiOnlyMode()) return session.name;
  return (await findUserByUsername(session.username))?.name || session.username;
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

  // Admin full edit of every field.
  if (body?.edit) {
    if (!can(auth.session.role, "manageAll")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const f = body.edit;
    for (const k of ["dept", "location", "job", "description", "nature"]) {
      if (!String(f[k] ?? "").trim()) return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!PRIORITIES.includes(f.priority)) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    if (!NT_STATUSES.includes(f.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    try {
      const notification = await updateNotification(id, f, await actorName(auth.session));
      return NextResponse.json({ notification });
    } catch (e) {
      console.error("PATCH /api/notifications/[id] edit failed:", e);
      return NextResponse.json({ error: "Could not update notification" }, { status: 500 });
    }
  }

  if (!can(auth.session.role, "review")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const status = body?.status;
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const who = isUiOnlyMode() ? auth.session.name : (await findUserByUsername(auth.session.username))?.name;
  try {
    const notification = await setNotificationStatus(id, status, who || auth.session.username);
    return NextResponse.json({ notification });
  } catch (e) {
    console.error("PATCH /api/notifications/[id] failed:", e);
    return NextResponse.json({ error: "Could not update notification" }, { status: 500 });
  }
}

// Admin only: delete a notification and any work order raised from it.
export async function DELETE(request, { params }) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!can(auth.session.role, "manageAll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await deleteNotification(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.message === "Not found") return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error("DELETE /api/notifications/[id] failed:", e);
    return NextResponse.json({ error: "Could not delete notification" }, { status: 500 });
  }
}
