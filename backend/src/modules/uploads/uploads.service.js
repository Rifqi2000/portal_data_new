// src/modules/uploads/uploads.service.js
const path = require("path");
const { parseCsv } = require("./parsers/parseCsv");
const { parseXlsx } = require("./parsers/parseXlsx");

// helper: ambil extension
function getExt(filename) {
  return path.extname(filename).toLowerCase();
}

async function handleUpload(db, { datasetId, file, actorUserId }) {
  // 1) Ambil info dataset
  const ds = (
    await db.query(
      `SELECT dataset_id, jenis_data, status
       FROM datasets
       WHERE dataset_id = $1::uuid`,
      [datasetId]
    )
  ).rows[0];

  if (!ds) {
    const err = new Error("Dataset not found.");
    err.code = "P0001";
    throw err;
  }

  if (ds.status !== "DRAFT") {
    const err = new Error(
      `Dataset is locked. Only editable in DRAFT (current: ${ds.status}).`
    );
    err.code = "P0001";
    throw err;
  }

  const jenisData = String(ds.jenis_data || "").toUpperCase();
  const ext = getExt(file.originalname);

  // =====================================================
  // 2) Jika TIDAK_TERSTRUKTUR: tidak parse, langsung simpan file metadata
  // =====================================================
  if (jenisData === "TIDAK_TERSTRUKTUR") {
    const version = await getNextVersion(db, datasetId);

    const fileRow = (
      await db.query(
        `
        INSERT INTO dataset_files (
          file_id, dataset_id, file_name, file_path, mime_type, file_size,
          version, is_active, uploaded_by, uploaded_at
        )
        VALUES (
          uuid_generate_v4(), $1::uuid, $2, $3, $4, $5,
          $6, true, $7::uuid, now()
        )
        RETURNING *
        `,
        [
          datasetId,
          file.originalname,
          file.path,
          file.mimetype,
          file.size,
          version,
          actorUserId,
        ]
      )
    ).rows[0];

    // pastikan hanya 1 file aktif
    await db.query(
      `UPDATE dataset_files
       SET is_active = false
       WHERE dataset_id = $1::uuid
         AND file_id <> $2::uuid
         AND is_active = true`,
      [datasetId, fileRow.file_id]
    );

    return {
      dataset_id: datasetId,
      jenis_data: ds.jenis_data,
      file: pickFile(fileRow),
      records: { inserted: 0, deleted: 0 },
      parse_info: {
        ext,
        delimiter: null,
        row_count: 0,
        note: "Non-structured: file saved only (no parsing).",
      },
    };
  }

  // =====================================================
  // 3) TERSTRUKTUR: parse dulu + validasi header
  // =====================================================
  let parsed;
  if (ext === ".csv") parsed = await parseCsv(file.path);
  else if (ext === ".xlsx" || ext === ".xls") parsed = await parseXlsx(file.path);
  else {
    const err = new Error("Structured dataset requires CSV/XLSX.");
    err.code = "P0001";
    throw err;
  }

  // delimiter hanya ada dari parseCsv; untuk xlsx akan undefined
  const { headers, rows, delimiter } = parsed;

  const expectedCols = await getExpectedColumns(db, datasetId);
  if (!expectedCols.length) {
    const err = new Error(
      "Dataset columns are empty. Please define dataset_columns first."
    );
    err.code = "P0001";
    throw err;
  }

  validateHeaders(headers, expectedCols);

  // =====================================================
  // 4) Setelah lolos validasi, baru simpan metadata file + overwrite records
  // =====================================================
  const version = await getNextVersion(db, datasetId);

  const fileRow = (
    await db.query(
      `
      INSERT INTO dataset_files (
        file_id, dataset_id, file_name, file_path, mime_type, file_size,
        version, is_active, uploaded_by, uploaded_at
      )
      VALUES (
        uuid_generate_v4(), $1::uuid, $2, $3, $4, $5,
        $6, true, $7::uuid, now()
      )
      RETURNING *
      `,
      [
        datasetId,
        file.originalname,
        file.path,
        file.mimetype,
        file.size,
        version,
        actorUserId,
      ]
    )
  ).rows[0];

  // nonaktifkan file aktif sebelumnya
  await db.query(
    `UPDATE dataset_files
     SET is_active = false
     WHERE dataset_id = $1::uuid
       AND file_id <> $2::uuid
       AND is_active = true`,
    [datasetId, fileRow.file_id]
  );

  // overwrite records
  const deleted = await deleteRecords(db, datasetId);
  const inserted = await insertRecordsBatch(db, datasetId, rows);

  return {
    dataset_id: datasetId,
    jenis_data: ds.jenis_data,
    file: pickFile(fileRow),
    records: { deleted, inserted },
    headers: { incoming: headers, expected: expectedCols },

    // ✅ Debugging info (berguna banget saat test)
    parse_info: {
      ext,
      delimiter: ext === ".csv" ? (delimiter || ",") : null,
      row_count: Array.isArray(rows) ? rows.length : 0,
    },
  };
}

// ============== helpers ==============

function pickFile(f) {
  return {
    file_id: f.file_id,
    file_name: f.file_name,
    version: f.version,
    is_active: f.is_active,
    uploaded_at: f.uploaded_at,
    file_size: f.file_size,
    mime_type: f.mime_type,
  };
}

async function getNextVersion(db, datasetId) {
  const r = await db.query(
    `SELECT COALESCE(MAX(version), 0)::int AS v
     FROM dataset_files
     WHERE dataset_id=$1::uuid`,
    [datasetId]
  );
  return (r.rows[0]?.v || 0) + 1;
}

async function getExpectedColumns(db, datasetId) {
  const r = await db.query(
    `SELECT column_name
     FROM dataset_columns
     WHERE dataset_id = $1::uuid
     ORDER BY column_order ASC, column_name ASC`,
    [datasetId]
  );
  return r.rows.map((x) => String(x.column_name));
}

function normalizeHeader(h) {
  return String(h || "").trim();
}

function validateHeaders(incomingHeaders, expectedColumns) {
  const incoming = incomingHeaders.map(normalizeHeader);
  const expected = expectedColumns.map(normalizeHeader);

  const missing = expected.filter((c) => !incoming.includes(c));
  const extra = incoming.filter((c) => c && !expected.includes(c));

  if (missing.length || extra.length) {
    const err = new Error(
      `Header mismatch. Missing: [${missing.join(", ")}], Extra: [${extra.join(", ")}]`
    );
    err.code = "P0001";
    throw err;
  }
}

async function deleteRecords(db, datasetId) {
  const r = await db.query(`DELETE FROM dataset_records WHERE dataset_id = $1::uuid`, [
    datasetId,
  ]);
  return r.rowCount || 0;
}

async function insertRecordsBatch(db, datasetId, rows) {
  if (!rows.length) return 0;

  const chunkSize = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const values = [];
    const params = [];
    let p = 1;

    for (const row of chunk) {
      values.push(`(uuid_generate_v4(), $${p++}::uuid, $${p++}::jsonb, now())`);
      params.push(datasetId);
      params.push(JSON.stringify(row));
    }

    const q = `
      INSERT INTO dataset_records (record_id, dataset_id, record_data, created_at)
      VALUES ${values.join(", ")}
    `;

    const r = await db.query(q, params);
    inserted += r.rowCount || chunk.length;
  }

  return inserted;
}

module.exports = { handleUpload };
