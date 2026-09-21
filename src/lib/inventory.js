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

// ── Stock movements: issuance slips and top-ups ─────────────────────────
// An issuance slip takes spares out of the store; a top-up brings them in. Each
// carries one or more spare lines. Issuing adds to an item's Issued total, a
// top-up adds to Received, so the balance stays opening + received − issued.

export const MOVEMENT = { ISSUE: "ISSUE", TOPUP: "TOPUP" };

// Slip numbers are typed by hand; "is-0418" and "IS-0418" are the same slip.
export const slipKey = (slipNo) => text(slipNo, 40).toUpperCase();

function cleanLines(raw) {
  return (Array.isArray(raw) ? raw : []).map((l) => ({ itemId: Number(l?.itemId), qty: qty(l?.qty) }));
}

function cleanWhen(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function cleanIssue(raw = {}) {
  return {
    slipNo: text(raw.slipNo, 40),
    when: cleanWhen(raw.when),
    lines: cleanLines(raw.lines),
    issuedBy: text(raw.issuedBy, 80),
    issuedTo: text(raw.issuedTo, 80),
    dept: text(raw.dept, 80),
    authorisedBy: text(raw.authorisedBy, 80),
    location: text(raw.location, 300),
  };
}

export function cleanTopUp(raw = {}) {
  return {
    when: cleanWhen(raw.when),
    lines: cleanLines(raw.lines),
    vendor: text(raw.vendor, 120),
    invoiceNo: text(raw.invoiceNo, 60),
  };
}

function lineProblem(lines) {
  if (!lines.length) return "Add at least one spare.";
  const seen = new Set();
  for (const [i, l] of lines.entries()) {
    const tag = lines.length > 1 ? `Spare ${i + 1}: ` : "";
    if (!Number.isInteger(l.itemId) || l.itemId <= 0) return `${tag}pick the spare from the list.`;
    if (!l.qty) return `${tag}enter the quantity.`;
    if (seen.has(l.itemId)) return "The same spare is listed twice. Combine it into one line.";
    seen.add(l.itemId);
  }
  return null;
}

// Each returns a message when the record can't be saved, otherwise null.
export function validateIssue(m) {
  if (!m.slipNo) return "Enter the issuance slip number.";
  if (!m.when) return "Enter the date and time it was issued.";
  return (
    lineProblem(m.lines) ||
    (!m.issuedBy && "Enter who issued it.") ||
    (!m.issuedTo && "Enter who it is issued to.") ||
    (!m.dept && "Choose the department.") ||
    (!m.authorisedBy && "Enter who authorised it.") ||
    (!m.location && "Choose where the spares will be used.") ||
    null
  );
}

export function validateTopUp(m) {
  if (!m.when) return "Enter the date and time it was received.";
  return lineProblem(m.lines) || (!m.vendor && "Enter the vendor it came from.") || (!m.invoiceNo && "Enter the invoice number.") || null;
}
