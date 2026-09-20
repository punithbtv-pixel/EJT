import { NextResponse } from "next/server";
import { requireInventory } from "@/lib/apiAuth";
import { cleanItem, validateItem } from "@/lib/inventory";
import { listInventory, createInventoryItem } from "@/lib/store";

// GET /api/inventory -> every spare in the store. Admin, Management, Stores and Electrical-department users.
export async function GET() {
  const auth = await requireInventory();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ items: await listInventory() });
}

// POST /api/inventory -> add a spare. Admin and Stores.
export async function POST(request) {
  const auth = await requireInventory("invManage");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const item = cleanItem(body);
  const problem = validateItem(item);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    return NextResponse.json({ item: await createInventoryItem(item) });
  } catch (e) {
    if (e.code === "DUP") return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("POST /api/inventory failed:", e);
    return NextResponse.json({ error: "Could not add the spare" }, { status: 500 });
  }
}
