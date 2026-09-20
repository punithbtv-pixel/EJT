// Client-side Excel export. Only ever writes a workbook built from data this
// app already trusts (never parses an uploaded file), so the known SheetJS
// advisories — which are about parsing attacker-supplied spreadsheets — do
// not apply to this write-only usage.
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
