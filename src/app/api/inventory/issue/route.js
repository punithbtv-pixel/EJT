import { NextResponse } from "next/server";
import { requireInventory } from "@/lib/apiAuth";
import { cleanIssue, validateIssue, MOVEMENT } from "@/lib/inventory";
import { recordMovement } from "@/lib/store";

// POST /api/inventory/issue -> issue one or more spares on a slip. Admin and Stores.
export async function POST(request) {
  const auth = await requireInventory("invManage");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const input = cleanIssue(body);
  const problem = validateIssue(input);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    return NextResponse.json(await recordMovement(MOVEMENT.ISSUE, input, auth.session.name));
  } catch (e) {
    if (e.code === "DUP" || e.code === "SHORT") return NextResponse.json({ error: e.message }, { status: 409 });
    if (e.code === "NOT_FOUND") return NextResponse.json({ error: e.message }, { status: 404 });
    console.error("POST /api/inventory/issue failed:", e);
    return NextResponse.json({ error: "Could not save the issuance slip" }, { status: 500 });
  }
}
