import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";
import { listDepartments, addDepartment, updateDepartment, deleteDepartment } from "@/lib/store";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ departments: await listDepartments() });
}

export async function POST(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const usedFor = body?.usedFor || "both";
  const department = await addDepartment({ name, notif: usedFor !== "work", work: usedFor !== "notif" });
  return NextResponse.json({ department });
}

export async function PATCH(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const { id, ...patch } = body || {};
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const department = await updateDepartment(id, patch);
    return NextResponse.json({ department });
  } catch {
    return NextResponse.json({ error: "Could not update department" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const { id } = body || {};
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const departments = await listDepartments();
  const dept = departments.find((d) => d.id === Number(id));
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dept.inUse > 0) {
    return NextResponse.json({ error: `In use by ${dept.inUse} record${dept.inUse === 1 ? "" : "s"} — deactivate instead of removing.` }, { status: 400 });
  }

  try {
    await deleteDepartment(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/departments failed:", e);
    return NextResponse.json({ error: "Could not remove department" }, { status: 500 });
  }
}
