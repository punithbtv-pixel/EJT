import { NextResponse } from "next/server";
import { requireInventory } from "@/lib/apiAuth";
import { listMovements } from "@/lib/store";

// GET /api/inventory/movements -> the latest issuance slips and top-ups. Anyone who can open Inventory.
export async function GET() {
  const auth = await requireInventory();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ movements: await listMovements() });
}
