import { NextResponse } from "next/server";
import { requireInventory } from "@/lib/apiAuth";
import { MOVEMENT } from "@/lib/inventory";
import { reportMovementLines } from "@/lib/store";

// GET /api/inventory/movements/report?kind=ISSUE|TOPUP&... -> the movement
// lines matching the given filters, for the Issuance / Top Up export. Anyone
// who can open Inventory (it only reads records, same as Export to Excel).
export async function GET(request) {
  const auth = await requireInventory();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const p = new URL(request.url).searchParams;
  const kind = p.get("kind") === "TOPUP" ? MOVEMENT.TOPUP : MOVEMENT.ISSUE;
  const filters = {
    from: p.get("from") || "",
    to: p.get("to") || "",
    spare: p.get("spare") || "",
    slipNo: p.get("slipNo") || "",
    dept: p.get("dept") || "",
    issuedTo: p.get("issuedTo") || "",
    location: p.get("location") || "",
    vendor: p.get("vendor") || "",
  };

  try {
    return NextResponse.json({ rows: await reportMovementLines(kind, filters) });
  } catch (e) {
    console.error("GET /api/inventory/movements/report failed:", e);
    return NextResponse.json({ error: "Could not load the report" }, { status: 500 });
  }
}
