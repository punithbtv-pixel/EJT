import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";
import { updateUser, deleteUser, findUserById } from "@/lib/store";
import { hashPassword } from "@/lib/session";
import { isUiOnlyMode } from "@/lib/mode";

// PATCH /api/users/[id] -> toggle active / edit a user account. Admin only.
export async function PATCH(request, { params }) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (isUiOnlyMode()) {
    return NextResponse.json({ error: "User management is not available in demo mode" }, { status: 400 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const patch = {};
  if (typeof body.active === "boolean") patch.active = body.active;
  if (body.name) patch.name = String(body.name).trim();
  if (body.role) {
    if (!Object.values(ROLES).includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    patch.role = body.role;
  }
  if (body.dept) patch.dept = body.dept;
  if (body.designation) patch.designation = body.designation;
  if (body.email !== undefined) patch.email = body.email;
  if (body.mobile !== undefined) patch.mobile = body.mobile;
  if (body.password) patch.passwordHash = await hashPassword(String(body.password));

  // An admin must not lock themselves out.
  const target = await findUserById(id);
  if (target?.username === auth.session.username && (patch.active === false || (patch.role && patch.role !== ROLES.ADMIN))) {
    return NextResponse.json({ error: "You cannot deactivate or demote your own account" }, { status: 400 });
  }

  try {
    const user = await updateUser(id, patch);
    return NextResponse.json({ user });
  } catch (e) {
    console.error("PATCH /api/users/[id] failed:", e);
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}

// DELETE /api/users/[id] -> remove a user account. Admin only, and never yourself.
export async function DELETE(request, { params }) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (isUiOnlyMode()) {
    return NextResponse.json({ error: "User management is not available in demo mode" }, { status: 400 });
  }

  const { id } = await params;
  const target = await findUserById(id);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.username === auth.session.username) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  try {
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.code === "P2003" || e.code === "P2014") {
      return NextResponse.json({ error: "Can't remove — this user has raised notifications or been assigned work orders. Deactivate instead." }, { status: 400 });
    }
    console.error("DELETE /api/users/[id] failed:", e);
    return NextResponse.json({ error: "Could not remove user" }, { status: 500 });
  }
}
