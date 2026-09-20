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

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    await deleteDepartment(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete department" }, { status: 500 });
  }
}
