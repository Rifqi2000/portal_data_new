// src/modules/dashboard/dashboard.service.js

// ================= RBAC HELPERS =================

function normUpper(v) {
  return String(v ?? "").trim().toUpperCase();
}

function canSeeAll(user) {
  const role = normUpper(user?.role || user?.role_name);
  return role === "PUSDATIN" || role === "KEPALA_PUSDATIN";
}

function applyRbac(whereParts, params, user, alias = "") {
  if (canSeeAll(user)) return;

  const bidangId = Number(user?.bidang_id);
  if (!Number.isFinite(bidangId) || bidangId <= 0) {
    const err = new Error("Invalid bidang_id in session context.");
    err.code = "P0001";
    throw err;
  }

  const col = alias ? `${alias}.bidang_id` : "bidang_id";
  params.push(bidangId);
  whereParts.push(`${col} = $${params.length}::int4`);
}

// ================= STATUS MAPPING =================

function mapStatusGroup(status) {
  const s = String(status || "").toUpperCase();

  if (["VERIFIED_PUSDATIN","VERIFIED","APPROVED_FINAL"].includes(s)) return "APPROVED";
  if (["REJECTED_KABID","REJECTED_PUSDATIN","REJECTED"].includes(s)) return "REJECTED";
  if (["SUBMITTED","APPROVED_KABID","PENDING","IN_REVIEW"].includes(s)) return "PENDING";
  if (s === "DRAFT") return "DRAFT";
  return "OTHER";
}

function parseIntSafe(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function monthNow() {
  return new Date().getMonth() + 1;
}

function normalizeStatusFilter(v) {
  const s = String(v || "").trim().toUpperCase();
  if (!["APPROVED","PENDING","REJECTED"].includes(s)) return null;
  return s;
}

// ================= 1️⃣ SUMMARY =================

async function getSummary(db, query, user) {

  const whereParts = ["deleted_at IS NULL"];
  const params = [];

  applyRbac(whereParts, params, user);

  const where = whereParts.join(" AND ");

  const r = await db.query(
    `SELECT status FROM portal_data.datasets WHERE ${where}`,
    params
  );

  let total = 0, approved = 0, pending = 0, rejected = 0;

  for (const row of r.rows) {
    total++;
    const g = mapStatusGroup(row.status);
    if (g === "APPROVED") approved++;
    else if (g === "PENDING") pending++;
    else if (g === "REJECTED") rejected++;
  }

  return { total, approved, pending, rejected };
}

// ================= 2️⃣ SCHEDULE =================

async function getSchedule(db, query, user) {

  const page = Math.max(1, parseIntSafe(query.page, 1));
  const limit = Math.min(50, Math.max(1, parseIntSafe(query.limit, 5)));
  const offset = (page - 1) * limit;

  const month = Math.max(1, Math.min(12, parseIntSafe(query.month, monthNow())));
  const periode = (query.periode_data || "").trim();
  const statusGroup = normalizeStatusFilter(query.status);

  const params = [];
  const whereParts = ["deleted_at IS NULL"];

  applyRbac(whereParts, params, user);

  // Filter bulan dari periode_data (karena masih text)
  const monthPatterns = [
    `${month}`,
    `${String(month).padStart(2,"0")}`,
  ];

  const bulanId = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
  monthPatterns.push(bulanId[month-1]);

  const monthConds = monthPatterns.map(() => `periode_data ILIKE $${params.length+1}`);
  monthPatterns.forEach(x => params.push(`%${x}%`));

  whereParts.push(`(${monthConds.join(" OR ")})`);

  if (periode) {
    params.push(periode);
    whereParts.push(`periode_data = $${params.length}`);
  }

  if (statusGroup) {
    if (statusGroup === "APPROVED")
      whereParts.push(`UPPER(status::text) IN ('VERIFIED_PUSDATIN','VERIFIED','APPROVED_FINAL')`);
    if (statusGroup === "PENDING")
      whereParts.push(`UPPER(status::text) IN ('SUBMITTED','APPROVED_KABID','PENDING','IN_REVIEW')`);
    if (statusGroup === "REJECTED")
      whereParts.push(`UPPER(status::text) IN ('REJECTED_KABID','REJECTED_PUSDATIN','REJECTED')`);
  }

  const where = whereParts.join(" AND ");

  const totalRes = await db.query(
    `SELECT COUNT(*)::int AS total FROM portal_data.datasets WHERE ${where}`,
    params
  );

  const total = totalRes.rows[0]?.total || 0;

  params.push(limit);
  params.push(offset);

  const itemsRes = await db.query(
    `
    SELECT dataset_id, bidang_id, nama_dataset, periode_data, frekuensi_update, status, created_at
    FROM portal_data.datasets
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length-1} OFFSET $${params.length}
    `,
    params
  );

  return { month, page, limit, total, items: itemsRes.rows };
}

// ================= 3️⃣ CHARTS =================

async function getCharts(db, query, user) {

  const year = parseIntSafe(query.year, new Date().getFullYear());
  const periode = (query.periode_data || "").trim();
  const statusGroup = normalizeStatusFilter(query.status);

  const params = [String(year)];
  const whereParts = ["deleted_at IS NULL", "to_char(created_at,'YYYY') = $1"];

  applyRbac(whereParts, params, user);

  if (periode) {
    params.push(periode);
    whereParts.push(`periode_data = $${params.length}`);
  }

  if (statusGroup === "APPROVED")
    whereParts.push(`UPPER(status::text) IN ('VERIFIED_PUSDATIN','VERIFIED','APPROVED_FINAL')`);

  if (statusGroup === "PENDING")
    whereParts.push(`UPPER(status::text) IN ('SUBMITTED','APPROVED_KABID','PENDING','IN_REVIEW')`);

  if (statusGroup === "REJECTED")
    whereParts.push(`UPPER(status::text) IN ('REJECTED_KABID','REJECTED_PUSDATIN','REJECTED')`);

  const where = whereParts.join(" AND ");

  const uploads = await db.query(
    `
    SELECT to_char(created_at,'YYYY-MM') AS month,
           COUNT(*)::int AS count
    FROM portal_data.datasets
    WHERE ${where}
    GROUP BY 1
    ORDER BY 1
    `,
    params
  );

  return {
    year,
    uploads_by_month: uploads.rows
  };
}

module.exports = { getSummary, getSchedule, getCharts };