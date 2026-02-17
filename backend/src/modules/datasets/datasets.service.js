async function list(db, query) {
  const { status, q, page = 1, limit = 10 } = query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = [];
  const vals = [];
  if (status) { vals.push(status); where.push(`d.status = $${vals.length}::dataset_status`); }
  if (q) { vals.push(`%${q}%`); where.push(`d.nama_dataset ILIKE $${vals.length}`); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const itemsQ = `
    SELECT d.dataset_id, d.bidang_id, d.nama_dataset, d.status, d.jenis_data, d.periode_data, d.updated_at
    FROM datasets d
    ${whereSql}
    ORDER BY d.updated_at DESC
    LIMIT ${Number(limit)} OFFSET ${offset}
  `;
  const items = (await db.query(itemsQ, vals)).rows;

  const countQ = `SELECT COUNT(*)::int as total FROM datasets d ${whereSql}`;
  const total = (await db.query(countQ, vals)).rows[0]?.total ?? 0;

  return { items, pagination: { page: Number(page), limit: Number(limit), total } };
}

async function detail(db, datasetId) {
  const ds = (await db.query(`SELECT * FROM datasets WHERE dataset_id=$1::uuid`, [datasetId])).rows[0];
  if (!ds) throw new Error("Dataset not found.");

  const activeFile = (await db.query(
    `SELECT * FROM dataset_files WHERE dataset_id=$1::uuid AND is_active=true ORDER BY version DESC LIMIT 1`,
    [datasetId]
  )).rows[0] || null;

  const stats = (await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM dataset_records WHERE dataset_id=$1::uuid) as record_count,
       (SELECT COUNT(*)::int FROM dataset_columns WHERE dataset_id=$1::uuid) as column_count
     `,
    [datasetId]
  )).rows[0];

  return { dataset: ds, active_file: activeFile, stats };
}

// ===== NEW: PREVIEW =====
async function preview(db, datasetId, query) {
  const limit = Math.min(200, Math.max(1, Number(query?.limit || 50)));
  const offset = Math.max(0, Number(query?.offset || 0));

  const ds = (await db.query(
    `SELECT dataset_id, nama_dataset, jenis_data, status
     FROM datasets
     WHERE dataset_id = $1::uuid`,
    [datasetId]
  )).rows[0];

  if (!ds) {
    const err = new Error("Dataset not found.");
    err.code = "P0001";
    throw err;
  }

  if (String(ds.jenis_data).toUpperCase() === "TIDAK_TERSTRUKTUR") {
    const err = new Error("Preview is only available for TERSTRUKTUR datasets.");
    err.code = "P0001";
    throw err;
  }

  const total = (await db.query(
    `SELECT COUNT(*)::int AS total
     FROM dataset_records
     WHERE dataset_id = $1::uuid`,
    [datasetId]
  )).rows[0]?.total ?? 0;

  const items = (await db.query(
    `SELECT record_id, record_data, created_at
     FROM dataset_records
     WHERE dataset_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [datasetId, limit, offset]
  )).rows;

  return {
    dataset: ds,
    items,
    pagination: { limit, offset, total },
  };
}

// ===== NEW: TEMPLATE CSV =====
function csvEscape(value) {
  // escape " menjadi ""
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function buildTemplateCsv(db, datasetId) {
  const ds = (await db.query(
    `SELECT dataset_id, nama_dataset, jenis_data
     FROM datasets
     WHERE dataset_id = $1::uuid`,
    [datasetId]
  )).rows[0];

  if (!ds) {
    const err = new Error("Dataset not found.");
    err.code = "P0001";
    throw err;
  }

  if (String(ds.jenis_data).toUpperCase() === "TIDAK_TERSTRUKTUR") {
    const err = new Error("Template is only available for TERSTRUKTUR datasets.");
    err.code = "P0001";
    throw err;
  }

  const cols = (await db.query(
    `SELECT column_name
     FROM dataset_columns
     WHERE dataset_id = $1::uuid
     ORDER BY column_order ASC, column_name ASC`,
    [datasetId]
  )).rows.map(r => r.column_name);

  if (!cols.length) {
    const err = new Error("Dataset columns are empty. Please define dataset_columns first.");
    err.code = "P0001";
    throw err;
  }

  // 1 baris header saja
  const headerLine = cols.map(csvEscape).join(",");
  return headerLine + "\n";
}

async function submit(db, datasetId) {
  const r = await db.query(`SELECT * FROM fn_submit_dataset($1::uuid)`, [datasetId]);
  return r.rows[0];
}

async function revise(db, datasetId) {
  const r = await db.query(`SELECT * FROM fn_revise_dataset($1::uuid)`, [datasetId]);
  return r.rows[0];
}

module.exports = {
  list,
  detail,
  preview,
  buildTemplateCsv,
  submit,
  revise,
};
