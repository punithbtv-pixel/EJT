import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { can, permsFor } from "@/lib/roles";
import { listWorkOrders, createWorkOrder, findUserByUsername } from "@/lib/store";
import { isUiOnlyMode } from "@/lib/mode";

async function sessionUser(session) {
  if (isUiOnlyMode()) return { id: 0, name: session.name, dept: "Admin" };
  const u = await findUserByUsername(session.username);
  if (!u) throw new Error("User not found");
  return u;
}

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const user = await sessionUser(auth.session);
  const scope = permsFor(auth.session.role).scope;
  const workOrders = await listWorkOrders({ scope, userDept: user.dept, userName: user.name });
  return NextResponse.json({ workOrders, scope });
}

export async function POST(request) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!can(auth.session.role, "convert")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { notificationNo, dept, location, job, description, nature, priority, assignedToName, plannedStart, plannedEnd, remarks } = body || {};
  if (!notificationNo || !dept || !location || !job || !description || !nature || !priority || !plannedStart || !plannedEnd) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (plannedEnd <= plannedStart) {
    return NextResponse.json({ error: "Planned end must be after planned start" }, { status: 400 });
  }

  const user = await sessionUser(auth.session);
  try {
    const workOrder = await createWorkOrder({
      notificationNo, dept, location, job, description, nature, priority,
      assignedToName: assignedToName || null, plannedStart, plannedEnd, remarks, createdByUser: user,
    });
    return NextResponse.json({ workOrder });
  } catch (e) {
    console.error("POST /api/workorders failed:", e);
    return NextResponse.json({ error: e.message || "Could not create work order" }, { status: 500 });
  }
}
