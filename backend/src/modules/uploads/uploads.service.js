// src/modules/uploads/uploads.service.js
const path = require("path");
const { parseCsv } = require("./parsers/parseCsv");
const { parseXlsx } = require("./parsers/parseXlsx");

// helper: ambil extension
function getExt(filename) {
  return path.extname(filename || "").toLowerCase();
}

function pickFile(f) {
  return {
    file_id: f.file_id,
    dataset_id: f.dataset_id,
    file_name: f.file_name,
    file_type: f.file_type, // ✅ gunakan file_type (mimetype)
    storage_path: f.storage_path,
    file_size: f.file_size,
    version: f.version,
    is_active: f.is_active,
    uploaded_by: f.uploaded_by,
    uploaded_at: f.uploaded_at,
  };
}

async function getNextVersion(db, datasetId) {
  const r = await db.query(
    `SELECT COALESCE(MAX(version), 0)::int AS v
     FROM portal_data.dataset_files
     WHERE dataset_id = $1::uuid`,
    [datasetId]
  );
  return (r.rows[0]?.v || 0) + 1;
}

async function getExpectedColumns(db, datasetId) {
  const r = await db.query(
    `SELECT nama_kolom
     FROM portal_data.dataset_columns
     WHERE dataset_id = $1::uuid
       AND COALESCE(is_active,true) = true
     ORDER BY urutan ASC, nama_kolom ASC`,
    [datasetId]
  );
  return r.rows.map((x) => String(x.nama_kolom));
}

function normalizeHeader(h) {
  return String(h || "").trim();
}

function validateHeaders(incomingHeaders, expectedColumns) {
  const incoming = (incomingHeaders || []).map(normalizeHeader);
  const expected = (expectedColumns || []).map(normalizeHeader);

  const missing = expected.filter((c) => !incoming.includes(c));
  const extra = incoming.filter((c) => c && !expected.includes(c));

  if (missing.length || extra.length) {
    const err = new Error(
      `Header mismatch. Missing: [${missing.join(", ")}], Extra: [${extra.join(", ")}]`
    );
    err.code = "P0001";
    err.status = 400;
    throw err;
  }
}

async function deactivateOldRecords(db, datasetId, actorUserId) {
  const r = await db.query(
    `UPDATE portal_data.dataset_records
     SET is_active = false,
         updated_by = $2::uuid,
         updated_at = now()
     WHERE dataset_id = $1::uuid
       AND is_active = true`,
    [datasetId, actorUserId]
  );
  return r.rowCount || 0;
}

async function insertRecordsBatch(db, datasetId, rows, actorUserId) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const chunkSize = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const values = [];
    const params = [];
    let p = 1;

    for (const row of chunk) {
      values.push(
        `(uuid_generate_v4(), $${p++}::uuid, $${p++}::jsonb, true, $${p++}::uuid, now())`
      );
      params.push(datasetId);
      params.push(JSON.stringify(row));
      params.push(actorUserId);
    }

    const q = `
      INSERT INTO portal_data.dataset_records (record_id, dataset_id, data, is_active, created_by, created_at)
      VALUES ${values.join(", ")}
    `;

    const r = await db.query(q, params);
    inserted += r.rowCount || chunk.length;
  }

  return inserted;
}

async function handleUpload(db, { datasetId, file, actorUserId }) {
  // 1) Ambil info dataset
  const ds = (
    await db.query(
      `SELECT dataset_id, jenis_data, status
       FROM portal_data.datasets
       WHERE dataset_id = $1::uuid`,
      [datasetId]
    )
  ).rows[0];

  if (!ds) {
    const err = new Error("Dataset not found.");
    err.code = "P0001";
    err.status = 404;
    throw err;
  }

  if (ds.status !== "DRAFT") {
    const err = new Error(`Dataset is locked. Only editable in DRAFT (current: ${ds.status}).`);
    err.code = "P0001";
    err.status = 400;
    throw err;
  }

  const jenisData = String(ds.jenis_data || "").toUpperCase();
  const ext = getExt(file.originalname);

  // ===== SIMPAN metadata file ke dataset_files (schema kamu) =====
  const version = await getNextVersion(db, datasetId);

  // ✅ file_type kita isi mimetype biar UI bisa tampil "MIME"
  const fileType = file.mimetype || ext || null;

  const fileRow = (
    await db.query(
      `
      INSERT INTO portal_data.dataset_files (
        file_id, dataset_id, file_name, file_type, storage_path,
        file_size, version, is_active, uploaded_by, uploaded_at
      )
      VALUES (
        uuid_generate_v4(), $1::uuid, $2::text, $3::text, $4::text,
        $5::int8, $6::int4, true, $7::uuid, now()
      )
      RETURNING *
      `,
      [
        datasetId,
        file.originalname,
        fileType,
        file.path,
        Number(file.size || 0),
        version,
        actorUserId,
      ]
    )
  ).rows[0];

  // pastikan hanya 1 file aktif
  await db.query(
    `UPDATE portal_data.dataset_files
     SET is_active = false
     WHERE dataset_id = $1::uuid
       AND file_id <> $2::uuid
       AND is_active = true`,
    [datasetId, fileRow.file_id]
  );

  // =====================================================
  // 2) Jika TIDAK_TERSTRUKTUR: stop sampai sini
  // =====================================================
  if (jenisData === "TIDAK_TERSTRUKTUR") {
    return {
      dataset_id: datasetId,
      jenis_data: ds.jenis_data,
      file: pickFile(fileRow),
      records: { inserted: 0, deactivated: 0 },
      parse_info: {
        ext,
        delimiter: null,
        row_count: 0,
        note: "Non-structured: file saved only (no parsing).",
      },
    };
  }

  // =====================================================
  // 3) TERSTRUKTUR: parse + validasi header
  // =====================================================
  let parsed;
  if (ext === ".csv") parsed = await parseCsv(file.path);
  else if (ext === ".xlsx" || ext === ".xls") parsed = await parseXlsx(file.path);
  else {
    const err = new Error("Structured dataset requires CSV/XLSX.");
    err.code = "P0001";
    err.status = 400;
    throw err;
  }

  const { headers, rows, delimiter } = parsed;

  const expectedCols = await getExpectedColumns(db, datasetId);
  if (!expectedCols.length) {
    const err = new Error("Dataset columns are empty. Please define dataset_columns first.");
    err.code = "P0001";
    err.status = 400;
    throw err;
  }

  validateHeaders(headers, expectedCols);

  // =====================================================
  // 4) Overwrite records (audit trail)
  // =====================================================
  const deactivated = await deactivateOldRecords(db, datasetId, actorUserId);
  const inserted = await insertRecordsBatch(db, datasetId, rows, actorUserId);

  return {
    dataset_id: datasetId,
    jenis_data: ds.jenis_data,
    file: pickFile(fileRow),
    records: { deactivated, inserted },
    headers: { incoming: headers, expected: expectedCols },
    parse_info: {
      ext,
      delimiter: ext === ".csv" ? (delimiter || ",") : null,
      row_count: Array.isArray(rows) ? rows.length : 0,
    },
  };
}

async function listFiles(db, { datasetId }) {
  const r = await db.query(
    `
    SELECT
      file_id, dataset_id, file_name, file_type, storage_path,
      file_size, version, is_active, uploaded_by, uploaded_at
    FROM portal_data.dataset_files
    WHERE dataset_id = $1::uuid
    ORDER BY uploaded_at DESC, version DESC
    `,
    [datasetId]
  );

  return {
    dataset_id: datasetId,
    items: r.rows.map(pickFile),
  };
}

async function getFileById(db, { fileId }) {
  const r = await db.query(
    `
    SELECT
      file_id, dataset_id, file_name, file_type, storage_path,
      file_size, version, is_active, uploaded_by, uploaded_at
    FROM portal_data.dataset_files
    WHERE file_id = $1::uuid
    LIMIT 1
    `,
    [fileId]
  );
  return r.rows[0] || null;
}

module.exports = { handleUpload, listFiles, getFileById };