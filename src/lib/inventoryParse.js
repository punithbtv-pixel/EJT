// Reads a store-stock workbook into inventory rows. Pure: the caller passes the
// SheetJS module, so it runs in the browser (Import), on the server (demo seed)
// and in prisma/seed.mjs. Relative imports only, for the seed script.
//
// Understands two layouts:
//  • the store workbooks — a "Net stock" sheet, either the IMPORTED layout
//    (PRODUCTS / DEPARTMENT / SECTION) or the LOCAL layout
//    (MATERIAL DESCRIPTIONS / TYPE / AREA);
//  • the file that Inventory → Export to Excel produces (has a "List" column).
import { cleanItem, nameKey, SOURCES } from "./inventory.js";

const norm = (v) => String(v ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const ALIASES = {
  name: ["material descriptions", "material description", "products", "product", "item", "item name"],
  location: ["location", "where to find it"],
  category: ["category", "type", "section"],
  dept: ["department", "area"],
  opening: ["opening stock", "opening"],
  received: ["received", "recevied"],
  issued: ["issued", "issued qty"],
  reorderLevel: ["reorder level"],
  fsn: ["fsn", "movement"],
  avgMonthly: ["eight months average", "avg issued / month", "avg. issued / month"],
  list: ["list", "store list"],
};

function mapHeader(row) {
  const map = {};
  row.forEach((cell, i) => {
    const h = norm(cell);
    if (!h) return;
    for (const [field, names] of Object.entries(ALIASES)) {
      if (map[field] === undefined && names.includes(h)) map[field] = i;
    }
  });
  return { map, cells: row.map(norm) };
}

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const { map, cells } = mapHeader(rows[i]);
    if (map.name !== undefined && map.opening !== undefined) return { index: i, map, cells };
  }
  return null;
}

function sourceOf(value) {
  const v = norm(value);
  return v === "imported" ? SOURCES.IMPORTED : v === "local" ? SOURCES.LOCAL : null;
}

// data: ArrayBuffer / Uint8Array / Buffer. `type` is SheetJS's read type.
export function parseInventoryFile(XLSX, data, type = "array") {
  // Read only the sheets we need — the store workbooks carry Purchase / Issue
  // sheets with hundreds of thousands of formatted rows.
  const names = XLSX.read(data, { type, bookSheets: true }).SheetNames;
  const stock = names.filter((n) => /net\s*stock/i.test(n));
  const wb = XLSX.read(data, { type, sheets: stock.length ? stock : undefined });

  const rows = [];
  const skipped = [];
  const warnings = [];
  const sheetsUsed = [];
  const seen = new Set();

  for (const sheetName of stock.length ? stock : wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
    const head = findHeader(grid);
    if (!head) {
      if (stock.length) warnings.push(`Sheet “${sheetName}” has no recognisable stock columns and was skipped.`);
      continue;
    }
    const { map, cells } = head;
    const layoutSource = cells.includes("products") ? SOURCES.IMPORTED : cells.includes("material descriptions") ? SOURCES.LOCAL : null;
    if (map.list === undefined && !layoutSource) {
      warnings.push(`Sheet “${sheetName}”: can't tell whether its items are Local or Imported (add a “List” column).`);
      continue;
    }
    sheetsUsed.push(sheetName);

    for (let r = head.index + 1; r < grid.length; r++) {
      const line = grid[r];
      const cell = (f) => (map[f] === undefined ? "" : line[map[f]]);
      const name = String(cell("name") ?? "").trim();
      if (!name) {
        // Fully blank rows are just padding; anything else with numbers but no name is reported.
        if (line.some((c) => String(c).trim() !== "")) skipped.push({ row: r + 1, sheet: sheetName, reason: "no item name" });
        continue;
      }
      const source = map.list !== undefined ? sourceOf(cell("list")) : layoutSource;
      if (!source) {
        skipped.push({ row: r + 1, sheet: sheetName, reason: "List must be Local or Imported" });
        continue;
      }
      const item = cleanItem({
        source, name,
        dept: cell("dept"),
        // Local sheets number their types ("2.Mechanical"); drop the number.
        category: String(cell("category") ?? "").replace(/^\d+\.\s*/, ""),
        location: cell("location"),
        opening: cell("opening"), received: cell("received"), issued: cell("issued"),
        reorderLevel: cell("reorderLevel"), fsn: cell("fsn"), avgMonthly: cell("avgMonthly"),
      });
      const key = `${item.source}|${nameKey(item.name)}`;
      if (seen.has(key)) {
        skipped.push({ row: r + 1, sheet: sheetName, reason: "name appears twice in the file" });
        continue;
      }
      seen.add(key);
      rows.push(item);
    }
  }
  return { rows, skipped, warnings, sheets: sheetsUsed };
}
