import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";
import { updateUser } from "@/lib/store";
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
  if (body.role) patch.role = body.role;
  if (body.dept) patch.dept = body.dept;
  if (body.designation) patch.designation = body.designation;
  if (body.email !== undefined) patch.email = body.email;
  if (body.mobile !== undefined) patch.mobile = body.mobile;

  try {
    const user = await updateUser(id, patch);
    return NextResponse.json({ user });
  } catch (e) {
    console.error("PATCH /api/users/[id] failed:", e);
    return NextResponse.json({ error: "Could not update user" }, { status: 500 });
  }
}
