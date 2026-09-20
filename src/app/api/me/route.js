import { NextResponse } from "next/server";
import { getSession } from "@/lib/apiAuth";
import { isUiOnlyMode } from "@/lib/mode";
import { roleLabel } from "@/lib/roles";
import { findUserByUsername } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isUiOnlyMode()) {
    // The demo identity itself lives in session.js (parseSessionToken) — read
    // it from the session rather than duplicating it here.
    return NextResponse.json({
      user: { username: session.username, name: session.name, role: session.role, roleLabel: roleLabel(session.role), dept: "Admin" },
    });
  }

  const user = await findUserByUsername(session.username);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    user: { username: user.username, name: user.name, role: user.role, roleLabel: roleLabel(user.role), dept: user.dept },
  });
}
