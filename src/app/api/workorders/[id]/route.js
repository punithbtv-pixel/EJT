import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { can, ROLES } from "@/lib/roles";
import { isUiOnlyMode } from "@/lib/mode";
import {
  getWorkOrderByNo, findUserByUsername,
  assignWorkOrder, startWorkOrder, holdWorkOrder, resumeWorkOrder, completeWorkOrder, closeWorkOrder, cancelWorkOrder,
  updateWorkOrder, editWorkOrder, deleteWorkOrder,
} from "@/lib/store";
import { PRIORITIES, WO_STATUSES } from "@/lib/constants";

const LOCKED = ["Completed", "Closed"];

async function sessionUser(session) {
  if (isUiOnlyMode()) return { id: 0, name: session.name };
  const u = await findUserByUsername(session.username);
  if (!u) throw new Error("User not found");
  return u;
}

export async function GET(request, { params }) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const workOrder = await getWorkOrderByNo(id);
  if (!workOrder) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ workOrder });
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

  const existing = await getWorkOrderByNo(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await sessionUser(auth.session);
  const isMine = existing.assignedToName === user.name;
  const action = body?.action;

  try {
    // "edit" covers two different affordances, told apart by body shape:
    // an admin's full-field override (body.fields, unrestricted by status),
    // and a lighter admin quick-correction (job/priority/assignedToName,
    // blocked once completed/closed).
    if (action === "edit" && body.fields) {
      if (!can(auth.session.role, "manageAll")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const f = body.fields;
      for (const k of ["dept", "location", "job", "description", "nature", "plannedStart", "plannedEnd"]) {
        if (!String(f[k] ?? "").trim()) return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
      }
      if (!PRIORITIES.includes(f.priority)) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      if (!WO_STATUSES.includes(f.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      if (f.plannedEnd <= f.plannedStart) return NextResponse.json({ error: "Planned end must be after planned start" }, { status: 400 });
      return NextResponse.json({ workOrder: await updateWorkOrder(id, f, user.name) });
    }
    if (action === "assign") {
      if (!can(auth.session.role, "assign")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!body.assignedToName) return NextResponse.json({ error: "Choose an engineer or technician" }, { status: 400 });
      const workOrder = await assignWorkOrder(id, body.assignedToName, user.name);
      return NextResponse.json({ workOrder });
    }
    if (action === "start") {
      if (!can(auth.session.role, "execute") || !isMine) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json({ workOrder: await startWorkOrder(id, user.name) });
    }
    if (action === "hold") {
      if (!can(auth.session.role, "execute") || !isMine) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json({ workOrder: await holdWorkOrder(id, user.name) });
    }
    if (action === "resume") {
      if (!can(auth.session.role, "execute") || !isMine) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json({ workOrder: await resumeWorkOrder(id, user.name) });
    }
    if (action === "complete") {
      if (!can(auth.session.role, "execute") || !isMine) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (!body.workDone) return NextResponse.json({ error: "Work done is required" }, { status: 400 });
      const workOrder = await completeWorkOrder(id, { workDone: body.workDone, spares: body.spares, remarks: body.remarks }, user.name);
      return NextResponse.json({ workOrder });
    }
    if (action === "close") {
      if (!can(auth.session.role, "close")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json({ workOrder: await closeWorkOrder(id, user.name) });
    }
    if (action === "cancel") {
      if (!can(auth.session.role, "close")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json({ workOrder: await cancelWorkOrder(id, user.name) });
    }
    if (action === "edit") {
      if (auth.session.role !== ROLES.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (LOCKED.includes(existing.status)) {
        return NextResponse.json({ error: "This work order is locked — it is already completed or closed." }, { status: 400 });
      }
      const patch = {};
      if (typeof body.job === "string" && body.job.trim()) patch.job = body.job.trim();
      if (typeof body.priority === "string") patch.priority = body.priority;
      if (body.assignedToName !== undefined) patch.assignedToName = body.assignedToName || null;
      if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      const workOrder = await editWorkOrder(id, patch, user.name);
      return NextResponse.json({ workOrder });
    }
    if (action === "edit") {
      if (auth.session.role !== ROLES.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (LOCKED.includes(existing.status)) {
        return NextResponse.json({ error: "This work order is locked — it is already completed or closed." }, { status: 400 });
      }
      const patch = {};
      if (typeof body.job === "string" && body.job.trim()) patch.job = body.job.trim();
      if (typeof body.priority === "string") patch.priority = body.priority;
      if (body.assignedToName !== undefined) patch.assignedToName = body.assignedToName || null;
      if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
      const workOrder = await editWorkOrder(id, patch, user.name);
      return NextResponse.json({ workOrder });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("PATCH /api/workorders/[id] failed:", e);
    return NextResponse.json({ error: e.message || "Could not update work order" }, { status: 500 });
  }
}

// DELETE /api/workorders/[id] -> remove a work order. Administrator only,
// unrestricted by status — the one place a completed/closed work order can
// still be removed. Reverts the source notification to Accepted, same as
// cancelling one.
export async function DELETE(request, { params }) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const existing = await getWorkOrderByNo(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await sessionUser(auth.session);
  try {
    await deleteWorkOrder(id, user.name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/workorders/[id] failed:", e);
    return NextResponse.json({ error: "Could not remove work order" }, { status: 500 });
  }
}
