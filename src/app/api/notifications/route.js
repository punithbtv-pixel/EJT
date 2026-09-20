import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { can, permsFor } from "@/lib/roles";
import { listNotifications, createNotification, findUserByUsername } from "@/lib/store";
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
  const notifications = await listNotifications({ scope, userDept: user.dept, userName: user.name });
  return NextResponse.json({ notifications, scope });
}

export async function POST(request) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!can(auth.session.role, "createNotif")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { dept, location, job, description, nature, priority } = body || {};
  if (!dept || !location || !job || !description || !nature || !priority) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const user = await sessionUser(auth.session);
  try {
    const notification = await createNotification({ dept, location, job, description, nature, priority, raisedByUser: user });
    return NextResponse.json({ notification });
  } catch (e) {
    console.error("POST /api/notifications failed:", e);
    return NextResponse.json({ error: "Could not create notification" }, { status: 500 });
  }
}
