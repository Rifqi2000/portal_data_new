const xlsx = require("xlsx");

function parseXlsx(filePath) {
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  // convert to JSON, header row diambil dari row pertama
  const json = xlsx.utils.sheet_to_json(ws, { defval: "" });

  const headers = json.length ? Object.keys(json[0]) : [];
  return { headers, rows: json };
}

module.exports = { parseXlsx };
