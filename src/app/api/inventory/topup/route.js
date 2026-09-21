import { NextResponse } from "next/server";
import { requireInventory } from "@/lib/apiAuth";
import { cleanTopUp, validateTopUp, MOVEMENT } from "@/lib/inventory";
import { recordMovement } from "@/lib/store";

// POST /api/inventory/topup -> add received spares to stock. Admin and Stores.
export async function POST(request) {
  const auth = await requireInventory("invManage");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const input = cleanTopUp(body);
  const problem = validateTopUp(input);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    return NextResponse.json(await recordMovement(MOVEMENT.TOPUP, input, auth.session.name));
  } catch (e) {
    if (e.code === "NOT_FOUND") return NextResponse.json({ error: e.message }, { status: 404 });
    console.error("POST /api/inventory/topup failed:", e);
    return NextResponse.json({ error: "Could not save the top-up" }, { status: 500 });
  }
}
