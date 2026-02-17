// src/modules/uploads/parsers/parseCsv.js
const fs = require("fs");
const { parse } = require("csv-parse/sync");

/**
 * CSV parser robust:
 * - support quoted fields (ada koma di dalam nilai)
 * - support \r\n / \n
 * - auto-detect delimiter , atau ;
 * - trim header & value
 */
function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // Auto detect delimiter: kalau banyak ';' kemungkinan CSV Excel Indonesia
  const commaCount = (content.match(/,/g) || []).length;
  const semiCount = (content.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ";" : ",";

  // Parse jadi records array-of-objects
  const records = parse(content, {
    columns: true,             // baris pertama jadi header
    skip_empty_lines: true,
    bom: true,                 // handle UTF-8 BOM
    delimiter,
    relax_quotes: true,
    relax_column_count: true,  // biar tidak error kalau ada kolom kosong di akhir
    trim: true,
  });

  // Headers: dari keys object pertama (kalau ada data)
  // Kalau file hanya header tanpa row, kita ambil header lewat parse columns dari first line.
  let headers = [];
  if (records.length) {
    headers = Object.keys(records[0]);
  } else {
    // fallback: ambil header dari baris pertama manual
    const firstLine = content.split(/\r?\n/).find((l) => l.trim() !== "") || "";
    headers = firstLine.split(delimiter).map((h) => String(h).trim());
  }

  // Normalisasi: pastikan semua kolom header ada di setiap row
  const rows = records.map((r) => {
    const obj = {};
    headers.forEach((h) => {
      obj[h] = r[h] ?? "";
    });
    return obj;
  });

  return { headers, rows, delimiter };
}

module.exports = { parseCsv };
