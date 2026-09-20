// Server / Node only: loads the store-stock workbooks that sit in the project's
// data/ folder. Used to seed the demo (UI_ONLY) store and `npm run db:seed`.
// The workbooks are deliberately not committed (see .gitignore) — with no files
// present this simply returns nothing.
import fs from "node:fs";
import path from "node:path";
import * as XLSXNS from "xlsx";
import { parseInventoryFile } from "./inventoryParse.js";

const XLSX = XLSXNS.default ?? XLSXNS;

export function loadInventoryFromDir(dir = path.join(process.cwd(), "data")) {
  if (!fs.existsSync(dir)) return [];
  const rows = [];
  const seen = new Set();
  for (const file of fs.readdirSync(dir).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith("~$")).sort()) {
    try {
      const { rows: parsed } = parseInventoryFile(XLSX, fs.readFileSync(path.join(dir, file)), "buffer");
      for (const r of parsed) {
        const key = `${r.source}|${r.name.toUpperCase()}`;
        if (!seen.has(key)) { seen.add(key); rows.push(r); }
      }
    } catch (e) {
      console.warn(`inventory: could not read ${file}: ${e.message}`);
    }
  }
  return rows;
}
