// src/modules/dashboard/dashboard.service.js

// ====== Helper mapping status untuk Card/Filter ======
function mapStatusGroup(status) {
  // sesuaikan bila status di DB kamu berbeda
  const s = String(status || "").toUpperCase();

  if (s === "VERIFIED_PUSDATIN" || s === "VERIFIED" || s === "APPROVED_FINAL") return "APPROVED";
  if (s === "REJECTED_KABID" || s === "REJECTED_PUSDATIN" || s === "REJECTED") return "REJECTED";
  if (s === "SUBMITTED" || s === "APPROVED_KABID" || s === "PENDING" || s === "IN_REVIEW") return "PENDING";
  if (s === "DRAFT") return "DRAFT";
  return "OTHER";
}

function parseIntSafe(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function monthNow() {
  return new Date().getMonth() + 1; // 1..12
}

function normalizeStatusFilter(v) {
  // yang dipakai FE: APPROVED | PENDING | REJECTED | (kosong)
  const s = String(v || "").trim().toUpperCase();
  if (!s) return null;
  if (!["APPROVED", "PENDING", "REJECTED"].includes(s)) return null;
  return s;
}

// ====== 1) SUMMARY ======
async function getSummary(db, query) {
  // Ambil semua status dalam scope RLS (Bidang vs Pusdatin)
  const r = await db.query(`
    SELECT status
    FROM portal_data.datasets
    WHERE deleted_at IS NULL
  `);

  let total = 0, approved = 0, pending = 0, rejected = 0;

  for (const row of r.rows) {
    total += 1;
    const g = mapStatusGroup(row.status);
    if (g === "APPROVED") approved += 1;
    else if (g === "PENDING") pending += 1;
    else if (g === "REJECTED") rejected += 1;
  }

  return { total, approved, pending, rejected };
}

// ====== 2) SCHEDULE (tabel list + pagination) ======
async function getSchedule(db, query) {
  const page = Math.max(1, parseIntSafe(query.page, 1));
  const limit = Math.min(50, Math.max(1, parseIntSafe(query.limit, 5)));
  const offset = (page - 1) * limit;

  const month = Math.max(1, Math.min(12, parseIntSafe(query.month, monthNow())));

  const periode = (query.periode_data || "").trim();          // filter periode_data
  const statusGroup = normalizeStatusFilter(query.status);    // filter status group

  const params = [];
  let p = 1;

  // Filter dasar: bulan cocok dengan bulan sekarang.
  // Karena di DB kamu periode_data berupa text, kita pakai ILIKE "Feb" / "02" / "Februari".
  // FE bisa kirim "month=2", dan ini cari pola yang mungkin ada di periode_data.
  // Kalau nanti kamu ubah periode_data menjadi tipe date/bulan, query-nya bisa dirapikan.
  const monthPatterns = [
    `${month}`,                 // 2
    `${String(month).padStart(2, "0")}`, // 02
  ];
  // mapping nama bulan indonesia (opsional)
  const bulanId = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];
  monthPatterns.push(bulanId[month - 1]);

  const monthLike = monthPatterns.map(() => `periode_data ILIKE $${p++}`).join(" OR ");
  params.push(...monthPatterns.map(x => `%${x}%`));

  let where = `
    deleted_at IS NULL
    AND (${monthLike})
  `;

  if (periode) {
    where += ` AND periode_data = $${p++}`;
    params.push(periode);
  }

  // Filter status group (APPROVED/PENDING/REJECTED)
  // Karena status asli bisa macam-macam, kita filter di SQL dengan CASE list minimal.
  // Jika status kamu sudah pasti: ganti bagian ini jadi "status IN (...)"
  if (statusGroup) {
    if (statusGroup === "APPROVED") {
      where += ` AND UPPER(status::text) IN ('VERIFIED_PUSDATIN','VERIFIED','APPROVED_FINAL')`;
    } else if (statusGroup === "PENDING") {
      where += ` AND UPPER(status::text) IN ('SUBMITTED','APPROVED_KABID','PENDING','IN_REVIEW')`;
    } else if (statusGroup === "REJECTED") {
      where += ` AND UPPER(status::text) IN ('REJECTED_KABID','REJECTED_PUSDATIN','REJECTED')`;
    }
  }

  // total
  const totalRes = await db.query(
    `SELECT COUNT(*)::int AS total FROM portal_data.datasets WHERE ${where}`,
    params
  );
  const total = totalRes.rows[0]?.total || 0;

  // items
  const itemsRes = await db.query(
    `
    SELECT
      dataset_id, bidang_id, nama_dataset, periode_data, frekuensi_update, status, created_at
    FROM portal_data.datasets
    WHERE ${where}
    ORDER BY created_at DESC
    LIMIT $${p++} OFFSET $${p++}
    `,
    [...params, limit, offset]
  );

  return {
    month,
    page,
    limit,
    total,
    items: itemsRes.rows,
  };
}

// ====== 3) CHARTS ======
async function getCharts(db, query) {
  const year = parseIntSafe(query.year, new Date().getFullYear());
  const periode = (query.periode_data || "").trim();
  const statusGroup = normalizeStatusFilter(query.status);

  const params = [String(year)];
  let p = 2;

  let where = `deleted_at IS NULL AND to_char(created_at, 'YYYY') = $1`;

  if (periode) {
    where += ` AND periode_data = $${p++}`;
    params.push(periode);
  }

  if (statusGroup) {
    if (statusGroup === "APPROVED") where += ` AND UPPER(status::text) IN ('VERIFIED_PUSDATIN','VERIFIED','APPROVED_FINAL')`;
    if (statusGroup === "PENDING") where += ` AND UPPER(status::text) IN ('SUBMITTED','APPROVED_KABID','PENDING','IN_REVIEW')`;
    if (statusGroup === "REJECTED") where += ` AND UPPER(status::text) IN ('REJECTED_KABID','REJECTED_PUSDATIN','REJECTED')`;
  }

  // Uploads by month (pakai created_at)
  const uploads = await db.query(
    `
    SELECT
      to_char(created_at, 'YYYY-MM') AS month,
      COUNT(*)::int AS count
    FROM portal_data.datasets
    WHERE ${where}
    GROUP BY 1
    ORDER BY 1
    `,
    params
  );

  // Top downloaded (sementara fallback: hit dari activity_log action='DOWNLOAD')
  // Jika belum ada log download, hasilnya kosong (FE tampilkan placeholder).
  const top = await db.query(
    `
    SELECT
      d.dataset_id,
      d.nama_dataset,
      COUNT(*)::int AS downloads
    FROM portal_data.dataset_activity_log l
    JOIN portal_data.datasets d ON d.dataset_id = l.dataset_id
    WHERE l.action = 'DOWNLOAD'
      AND d.deleted_at IS NULL
    GROUP BY d.dataset_id, d.nama_dataset
    ORDER BY downloads DESC
    LIMIT 10
    `
  );

  return {
    year,
    uploads_by_month: uploads.rows,
    top_downloaded: top.rows,
  };
}

module.exports = { getSummary, getSchedule, getCharts };
