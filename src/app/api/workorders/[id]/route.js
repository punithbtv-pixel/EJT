import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { can } from "@/lib/roles";
import { isUiOnlyMode } from "@/lib/mode";
import {
  getWorkOrderByNo, findUserByUsername,
  assignWorkOrder, startWorkOrder, holdWorkOrder, resumeWorkOrder, completeWorkOrder, closeWorkOrder, cancelWorkOrder,
} from "@/lib/store";

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
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("PATCH /api/workorders/[id] failed:", e);
    return NextResponse.json({ error: e.message || "Could not update work order" }, { status: 500 });
  }
}
