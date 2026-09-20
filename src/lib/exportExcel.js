// Client-side Excel export. This module only ever writes a workbook built from
// data the app already trusts, so the known SheetJS advisories — which are about
// parsing attacker-supplied spreadsheets — do not apply to it.
// (Inventory → Import stock is the one place that reads an uploaded workbook:
// it is limited to Administrator and Stores, runs in that user's own browser on
// their own file, and the server only receives rows it re-validates.)
import * as XLSX from "xlsx";

// columns: [{ key, header }]; rows: array of objects.
export function exportToExcel(filename, columns, rows) {
  const data = rows.map((row) => {
    const out = {};
    for (const col of columns) out[col.header] = row[col.key] ?? "";
    return out;
  });
  const sheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
  sheet["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.header.length + 2) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  XLSX.writeFile(book, filename);
}
