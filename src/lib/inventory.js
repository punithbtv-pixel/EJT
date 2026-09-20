// Shared inventory (store stock) rules. Pure — no imports — so the same code runs
// in the browser (Inventory page, Import), in API routes and in prisma/seed.mjs.

export const SOURCES = { LOCAL: "LOCAL", IMPORTED: "IMPORTED" };
export const SOURCE_LABEL = { LOCAL: "Local", IMPORTED: "Imported" };

const text = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const round = (n) => Math.round(n * 1000) / 1000;

// Names are matched case-insensitively with whitespace collapsed.
export const nameKey = (name) => text(name, 300).toUpperCase();

function qty(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? round(n) : 0;
}

export function titleCase(s) {
  return String(s || "").toLowerCase().replace(/(^|[\s/&(-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

// Normalises anything that looks like an item (form input, spreadsheet row) into
// the stored shape. Department and location are kept upper-case, as in the store sheets.
export function cleanItem(raw = {}) {
  const src = String(raw.source ?? "").trim().toUpperCase();
  return {
    source: src === "IMPORTED" ? SOURCES.IMPORTED : src === "LOCAL" ? SOURCES.LOCAL : src,
    name: text(raw.name, 200),
    dept: text(raw.dept, 80).toUpperCase(),
    category: text(raw.category, 80),
    location: text(raw.location, 60).toUpperCase(),
    opening: qty(raw.opening),
    received: qty(raw.received),
    issued: qty(raw.issued),
    reorderLevel: qty(raw.reorderLevel),
    fsn: text(raw.fsn, 40),
    avgMonthly: qty(raw.avgMonthly),
  };
}

// Returns a message when the item can't be saved, otherwise null.
export function validateItem(item) {
  if (!item.name) return "Enter the item name.";
  if (item.source !== SOURCES.LOCAL && item.source !== SOURCES.IMPORTED) return "Choose Local or Imported.";
  return null;
}

// Stock on hand — the same formula the store sheets use.
export const balanceOf = (i) => round(i.opening + i.received - i.issued);

// OUT: nothing left. LOW: at / below the reorder level. The two store sheets use
// slightly different rules, so each list keeps its own: Imported reorders when the
// balance is at or below the level, Local only when it is strictly below.
export function stockStatus(source, balance, level) {
  if (balance <= 0) return "OUT";
  const low = source === SOURCES.IMPORTED ? balance <= level : balance < level;
  return low ? "LOW" : "OK";
}

export const STATUS_LABEL = { OK: "In stock", LOW: "Low stock", OUT: "Out of stock" };

const IMPORT_FIELDS = [
  ["opening", "Opening", "number"],
  ["received", "Received", "number"],
  ["issued", "Issued", "number"],
  ["reorderLevel", "Reorder level", "number"],
  ["location", "Location", "text"],
  ["dept", "Department", "text"],
  ["category", "Category", "text"],
];

// What an import would change on an existing item. Numbers always follow the file.
// Text fields only change when the file has a value, so a blank cell never wipes
// out a location someone typed in.
export function importChanges(current, incoming) {
  const out = [];
  for (const [field, label, kind] of IMPORT_FIELDS) {
    const to = incoming[field];
    if (kind === "text" && !to) continue;
    if (to !== current[field]) out.push({ field, label, from: current[field], to });
  }
  if (incoming.fsn) {
    if (incoming.fsn !== current.fsn) out.push({ field: "fsn", label: "Movement", from: current.fsn || "", to: incoming.fsn });
    if (incoming.avgMonthly !== (current.avgMonthly || 0)) out.push({ field: "avgMonthly", label: "Avg. issued / month", from: current.avgMonthly || 0, to: incoming.avgMonthly });
  }
  return out;
}

// Columns of the Excel export. Import understands this same layout, so a file
// exported from Inventory can be edited and imported back.
export const EXPORT_COLUMNS = [
  { key: "list", header: "List" },
  { key: "name", header: "Item" },
  { key: "dept", header: "Department" },
  { key: "category", header: "Category" },
  { key: "location", header: "Location" },
  { key: "opening", header: "Opening" },
  { key: "received", header: "Received" },
  { key: "issued", header: "Issued" },
  { key: "balance", header: "In stock" },
  { key: "reorderLevel", header: "Reorder level" },
  { key: "statusLabel", header: "Status" },
  { key: "fsn", header: "Movement" },
  { key: "avgMonthly", header: "Avg issued / month" },
];
