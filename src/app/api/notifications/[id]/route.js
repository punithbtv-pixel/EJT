import { NextResponse } from "next/server";
import { requireSession } from "@/lib/apiAuth";
import { can } from "@/lib/roles";
import { getNotificationByNo, setNotificationStatus, findUserByUsername } from "@/lib/store";
import { isUiOnlyMode } from "@/lib/mode";

const ALLOWED = ["Under Review", "Accepted", "Rejected"];

export async function GET(request, { params }) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const notification = await getNotificationByNo(id);
  if (!notification) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ notification });
}

export async function PATCH(request, { params }) {
  const auth = await requireSession();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!can(auth.session.role, "review")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = body?.status;
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const who = isUiOnlyMode() ? auth.session.name : (await findUserByUsername(auth.session.username))?.name;
  try {
    const notification = await setNotificationStatus(id, status, who || auth.session.username);
    return NextResponse.json({ notification });
  } catch (e) {
    console.error("PATCH /api/notifications/[id] failed:", e);
    return NextResponse.json({ error: "Could not update notification" }, { status: 500 });
  }
}
