import { NextResponse } from "next/server";
import { requireInventory } from "@/lib/apiAuth";
import { cleanItem, validateItem } from "@/lib/inventory";
import { updateInventoryItem, deleteInventoryItem } from "@/lib/store";

// PATCH /api/inventory/[id] -> edit a spare. Admin and Stores.
export async function PATCH(request, { params }) {
  const auth = await requireInventory("invManage");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // The list (Local / Imported) can't change, and the movement fields come from the store sheet.
  const { fsn: _fsn, avgMonthly: _avg, ...item } = cleanItem({ ...body, source: "LOCAL" });
  const problem = validateItem({ ...item, source: "LOCAL" });
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    return NextResponse.json({ item: await updateInventoryItem(id, item) });
  } catch (e) {
    if (e.code === "NOT_FOUND") return NextResponse.json({ error: "That spare no longer exists" }, { status: 404 });
    if (e.code === "DUP") return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("PATCH /api/inventory/[id] failed:", e);
    return NextResponse.json({ error: "Could not save the spare" }, { status: 500 });
  }
}

// DELETE /api/inventory/[id] -> remove a spare. Admin and Stores.
export async function DELETE(request, { params }) {
  const auth = await requireInventory("invManage");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  try {
    await deleteInventoryItem(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.code === "NOT_FOUND") return NextResponse.json({ error: "That spare no longer exists" }, { status: 404 });
    console.error("DELETE /api/inventory/[id] failed:", e);
    return NextResponse.json({ error: "Could not delete the spare" }, { status: 500 });
  }
}
