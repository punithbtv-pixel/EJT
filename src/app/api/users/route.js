import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { ROLES } from "@/lib/roles";
import { listUsers, addUser } from "@/lib/store";
import { hashPassword } from "@/lib/session";
import { isUiOnlyMode } from "@/lib/mode";

// GET /api/users -> list app users (no password hashes). Admin only.
export async function GET() {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ users: await listUsers() });
}

// POST /api/users -> add a new user account. Admin only.
export async function POST(request) {
  const auth = await requireSession(ROLES.ADMIN);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (isUiOnlyMode()) {
    return NextResponse.json({ error: "User management is not available in demo mode" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  const role = String(body?.role ?? "");
  const dept = String(body?.dept ?? "");
  const designation = String(body?.designation ?? "");

  if (!username || !password || !name || !dept) {
    return NextResponse.json({ error: "Name, username, password and department are required" }, { status: 400 });
  }
  if (!Object.values(ROLES).includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await addUser({ username, passwordHash, name, role, dept, designation, email: body?.email, mobile: body?.mobile });
    return NextResponse.json({ user });
  } catch (e) {
    if (e.code === "DUP") return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("POST /api/users failed:", e);
    return NextResponse.json({ error: "Could not create user" }, { status: 500 });
  }
}
