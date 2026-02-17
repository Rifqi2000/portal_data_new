function parsePaging(query) {
  const page = Math.max(1, Number(query?.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query?.limit || 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

async function listQueueKabid(db, query) {
  const { page, limit, offset } = parsePaging(query);
  const q = (query?.q || "").trim();
  const bidangId = query?.bidang_id ? Number(query.bidang_id) : null;

  const where = [`d.status = 'SUBMITTED'::dataset_status`];
  const vals = [];

  if (q) {
    vals.push(`%${q}%`);
    where.push(`(d.nama_dataset ILIKE $${vals.length} OR d.sumber_data ILIKE $${vals.length})`);
  }
  if (Number.isFinite(bidangId)) {
    vals.push(bidangId);
    where.push(`d.bidang_id = $${vals.length}`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const itemsQ = `
    SELECT
      d.dataset_id,
      d.bidang_id,
      b.nama_bidang,
      d.nama_dataset,
      d.jenis_data,
      d.periode_data,
      d.frekuensi_update,
      d.status,
      d.created_at,
      d.updated_at
    FROM datasets d
    LEFT JOIN bidang b ON b.bidang_id = d.bidang_id
    ${whereSql}
    ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const items = (await db.query(itemsQ, vals)).rows;

  const countQ = `SELECT COUNT(*)::int AS total FROM datasets d ${whereSql}`;
  const total = (await db.query(countQ, vals)).rows[0]?.total ?? 0;

  return { items, pagination: { page, limit, total } };
}

async function listQueuePusdatin(db, query) {
  const { page, limit, offset } = parsePaging(query);
  const q = (query?.q || "").trim();
  const bidangId = query?.bidang_id ? Number(query.bidang_id) : null;

  const where = [`d.status = 'APPROVED_BY_KABID'::dataset_status`];
  const vals = [];

  if (q) {
    vals.push(`%${q}%`);
    where.push(`(d.nama_dataset ILIKE $${vals.length} OR d.sumber_data ILIKE $${vals.length})`);
  }
  if (Number.isFinite(bidangId)) {
    vals.push(bidangId);
    where.push(`d.bidang_id = $${vals.length}`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const itemsQ = `
    SELECT
      d.dataset_id,
      d.bidang_id,
      b.nama_bidang,
      d.nama_dataset,
      d.jenis_data,
      d.periode_data,
      d.frekuensi_update,
      d.status,
      d.created_at,
      d.updated_at
    FROM datasets d
    LEFT JOIN bidang b ON b.bidang_id = d.bidang_id
    ${whereSql}
    ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const items = (await db.query(itemsQ, vals)).rows;

  const countQ = `SELECT COUNT(*)::int AS total FROM datasets d ${whereSql}`;
  const total = (await db.query(countQ, vals)).rows[0]?.total ?? 0;

  return { items, pagination: { page, limit, total } };
}

// ===== ACTIONS (tetap seperti sebelumnya) =====
async function approveKabid(db, datasetId) {
  const r = await db.query(`SELECT * FROM fn_approve_kabid($1::uuid)`, [datasetId]);
  return r.rows[0];
}

async function rejectKabid(db, datasetId, reason) {
  const r = await db.query(`SELECT * FROM fn_reject_kabid($1::uuid, $2::text)`, [datasetId, reason]);
  return r.rows[0];
}

async function verifyPusdatin(db, datasetId) {
  const r = await db.query(`SELECT * FROM fn_verify_pusdatin($1::uuid)`, [datasetId]);
  return r.rows[0];
}

async function rejectPusdatin(db, datasetId, reason) {
  const r = await db.query(`SELECT * FROM fn_reject_pusdatin($1::uuid, $2::text)`, [datasetId, reason]);
  return r.rows[0];
}

module.exports = {
  listQueueKabid,
  listQueuePusdatin,
  approveKabid,
  rejectKabid,
  verifyPusdatin,
  rejectPusdatin,
};
