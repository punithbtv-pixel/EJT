import { NextResponse } from "next/server";
import { requireInventory } from "@/lib/apiAuth";
import { cleanItem, validateItem, balanceOf } from "@/lib/inventory";
import { planInventoryImport, applyInventoryImport } from "@/lib/store";

// A first import writes a few thousand rows.
export const maxDuration = 60;

const MAX_ROWS = 20000;
const PREVIEW_NEW = 100;
const PREVIEW_UPDATES = 200;

// POST /api/inventory/import  { rows, apply }
//   apply: false (default) -> preview: what would change, nothing is saved
//   apply: true            -> save the changes
// Rows come from the browser, which reads the uploaded workbook; they are
// re-validated here. Admin and Stores.
export async function POST(request) {
  const auth = await requireInventory("invImport");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.rows)) return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  if (body.rows.length > MAX_ROWS) return NextResponse.json({ error: `Too many rows (limit ${MAX_ROWS.toLocaleString()})` }, { status: 400 });

  const rows = [];
  const rejected = [];
  body.rows.forEach((raw, i) => {
    const item = cleanItem(raw);
    const problem = validateItem(item);
    if (problem) rejected.push({ row: i + 1, name: item.name, reason: problem });
    else rows.push(item);
  });

  try {
    const plan = await planInventoryImport(rows);
    if (body.apply) {
      await applyInventoryImport(plan);
      return NextResponse.json({
        applied: true, added: plan.news.length, updated: plan.updates.length, unchanged: plan.unchanged, rejected: rejected.length,
      });
    }
    return NextResponse.json({
      applied: false,
      counts: {
        added: plan.news.length, updated: plan.updates.length, unchanged: plan.unchanged,
        notInFile: plan.notInFile, duplicates: plan.duplicates, rejected: rejected.length,
      },
      added: plan.news.slice(0, PREVIEW_NEW).map((n) => ({
        source: n.source, name: n.name, location: n.location, dept: n.dept, balance: balanceOf(n),
      })),
      updated: plan.updates.slice(0, PREVIEW_UPDATES),
      rejected: rejected.slice(0, 20),
    });
  } catch (e) {
    console.error("POST /api/inventory/import failed:", e);
    return NextResponse.json({ error: "Could not import the stock file" }, { status: 500 });
  }
}
