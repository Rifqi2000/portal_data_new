// src/modules/datasets/datasets.service.js

// =========================
// Helpers
// =========================
function normUpper(v) {
  return String(v ?? "").trim().toUpperCase();
}

function formatHeader(v) {
  return String(v ?? "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function mapJenisData(v) {
  const s = normUpper(v).replace(/\s+/g, "_");
  if (["TERSTRUKTUR", "DATA_TERSTRUKTUR"].includes(s)) return "TERSTRUKTUR";
  if (["TIDAK_TERSTRUKTUR", "DATA_TIDAK_TERSTRUKTUR"].includes(s)) return "TIDAK_TERSTRUKTUR";
  return "";
}

// ✅ ENUM kamu: TERBUKA / TERBATAS / RAHASIA
// fallback: TERTUTUP -> RAHASIA
function mapAccessLevel(v) {
  const s = normUpper(v).replace(/\s+/g, "_");
  if (["TERBUKA", "TERBATAS", "RAHASIA"].includes(s)) return s;
  if (s === "TERTUTUP") return "RAHASIA";
  return "";
}

function mapSpasial(v) {
  const s = normUpper(v).replace(/\s+/g, "_");
  if (["SPASIAL", "NON_SPASIAL"].includes(s)) return s;
  return "";
}

function mapSdiStatus(v) {
  const s = normUpper(v).replace(/\s+/g, "_");
  if (["SDI", "NON_SDI"].includes(s)) return s;
  return "";
}

function mapDssdStatus(v) {
  const s = normUpper(v).replace(/\s+/g, "_");
  if (["DSSD", "NON_DSSD"].includes(s)) return s;
  return "";
}

function mapPeriodePemutakhiran(v) {
  const s = normUpper(v);
  const normalized = s.replace(/\s+/g, " ").trim();

  const allowed = new Set([
    "1 MINGGU SEKALI",
    "1 BULAN SEKALI",
    "3 BULAN SEKALI",
    "6 BULAN SEKALI",
    "1 TAHUN SEKALI",
    "LIMA TAHUN SEKALI",
  ]);

  if (allowed.has(normalized)) return normalized;

  if (normalized === "5 TAHUN SEKALI") return "LIMA TAHUN SEKALI";
  if (normalized === "1 TAHUN") return "1 TAHUN SEKALI";
  if (normalized === "1 BULAN") return "1 BULAN SEKALI";

  return "";
}

/**
 * Role helpers (RBAC LIST)
 * - BIDANG, KEPALA_BIDANG => hanya bidang sendiri
 * - PUSDATIN, KEPALA_PUSDATIN => semua
 */
function getRoleUpper(user) {
  // dukung beberapa bentuk payload user
  // user.role, user.role_name, user.roles[]
  const direct = normUpper(user?.role || user?.role_name || "");
  if (direct) return direct;

  const arr = Array.isArray(user?.roles) ? user.roles : [];
  // ambil role pertama kalau ada
  const first = arr.length ? normUpper(arr[0]) : "";
  return first;
}

function hasRole(user, role) {
  const target = normUpper(role);
  const direct = normUpper(user?.role || user?.role_name || "");
  if (direct === target) return true;

  const arr = Array.isArray(user?.roles) ? user.roles : [];
  return arr.some((r) => normUpper(r) === target);
}

function pickBidangId(user) {
  const v = user?.bidang_id ?? user?.bidangId ?? user?.bidang?.id;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function assertUserContext(user) {
  if (!user?.user_id) {
    const err = new Error("Missing user_id in session context.");
    err.code = "P0001";
    throw err;
  }
  if (!user?.role && !user?.role_name && !Array.isArray(user?.roles)) {
    const err = new Error("Missing role in session context.");
    err.code = "P0001";
    throw err;
  }
  if (user?.bidang_id == null) {
    const err = new Error("Missing bidang_id in session context.");
    err.code = "P0001";
    throw err;
  }

  const bidangId = Number(user.bidang_id);
  if (!Number.isFinite(bidangId) || bidangId <= 0) {
    const err = new Error("Invalid bidang_id in session context.");
    err.code = "P0001";
    throw err;
  }

  return { bidangId, createdBy: String(user.user_id) };
}

function pickMeta(meta, ...keys) {
  for (const k of keys) {
    const v = meta?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function makePhysicalTableName(datasetId) {
  const nodash = String(datasetId).replace(/-/g, "");
  return `ds_${nodash}`;
}

// =========================
// LIST (RBAC applied here)
// =========================
async function list(db, query, reqUser) {
  const { status, q, page = 1, limit = 10 } = query;

  // ---- RBAC ----
  // BIDANG + KEPALA_BIDANG => harus punya bidang_id dan filter d.bidang_id
  // PUSDATIN + KEPALA_PUSDATIN => boleh semua (tanpa filter bidang)
  const isBidangLike = hasRole(reqUser, "BIDANG") || hasRole(reqUser, "KEPALA_BIDANG");
  const canSeeAll = hasRole(reqUser, "PUSDATIN") || hasRole(reqUser, "KEPALA_PUSDATIN");

  const bidangId = pickBidangId(reqUser);

  if (!canSeeAll && isBidangLike) {
    if (!bidangId) {
      const err = new Error("Missing bidang_id for BIDANG/KEPALA_BIDANG.");
      err.code = "P0001";
      throw err;
    }
  }

  // kalau role lain tidak dikenal: paling aman => treat seperti bidang (kalau ada), kalau tidak => deny
  if (!canSeeAll && !isBidangLike) {
    if (bidangId) {
      // ok, filter by bidang saja
    } else {
      const err = new Error("Role not allowed to list datasets.");
      err.code = "P0001";
      throw err;
    }
  }

  // ---- pagination ----
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;

  const where = [`d.deleted_at IS NULL`];
  const vals = [];

  // ✅ RBAC WHERE
  if (!canSeeAll) {
    // BIDANG / KEPALA_BIDANG / role lain yang diperlakukan seperti bidang
    vals.push(Number(bidangId));
    where.push(`d.bidang_id = $${vals.length}::int4`);
  }

  if (status) {
    vals.push(normUpper(status));
    where.push(`d.status = $${vals.length}::portal_data.dataset_status`);
  }

  if (q) {
    vals.push(`%${String(q).trim()}%`);
    where.push(`d.nama_dataset ILIKE $${vals.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  vals.push(safeLimit);
  const limitIdx = vals.length;
  vals.push(offset);
  const offsetIdx = vals.length;

  const itemsQ = `
    SELECT
      d.dataset_id,
      d.bidang_id,
      d.nama_dataset,
      d.deskripsi_dataset,
      d.produsen_data,
      d.jenis_data,
      d.periode_pemutakhiran,
      d.status,
      d.sdi_status,
      d.dssd_status,
      d.access_level,
      d.spasial_status,
      d.updated_at,
      d.created_at
    FROM portal_data.datasets d
    ${whereSql}
    ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;
  const items = (await db.query(itemsQ, vals)).rows;

  const countVals = vals.slice(0, vals.length - 2);
  const countQ = `SELECT COUNT(*)::int as total FROM portal_data.datasets d ${whereSql}`;
  const total = (await db.query(countQ, countVals)).rows[0]?.total ?? 0;

  return { items, pagination: { page: safePage, limit: safeLimit, total } };
}

// =========================
// DETAIL
// =========================
async function detail(db, datasetId) {
  const ds = (
    await db.query(
      `SELECT *
       FROM portal_data.datasets
       WHERE dataset_id=$1::uuid AND deleted_at IS NULL`,
      [datasetId]
    )
  ).rows[0];

  if (!ds) {
    const err = new Error("Dataset not found.");
    err.code = "P0001";
    throw err;
  }

  const columns = (
    await db.query(
      `SELECT
         column_id,
         dataset_id,
         nama_kolom,
         nama_tampilan,
         definisi_kolom,
         tipe_data,
         nullable,
         panjang_maks,
         aturan_validasi,
         contoh_nilai,
         urutan,
         is_active
       FROM portal_data.dataset_columns
       WHERE dataset_id=$1::uuid
       ORDER BY urutan ASC NULLS LAST, nama_kolom ASC`,
      [datasetId]
    )
  ).rows;

  const stats = (
    await db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM portal_data.dataset_records WHERE dataset_id=$1::uuid) as record_count,
         (SELECT COUNT(*)::int FROM portal_data.dataset_columns WHERE dataset_id=$1::uuid) as column_count`,
      [datasetId]
    )
  ).rows[0];

  return { dataset: ds, columns, active_file: null, stats };
}

// =========================
// CHECK NAME
// =========================
async function checkName(db, { nama_dataset }) {
  const nama = String(nama_dataset || "").trim();
  if (!nama) {
    const err = new Error("nama_dataset is required.");
    err.code = "P0001";
    throw err;
  }

  const exists =
    (
      await db.query(
        `SELECT 1
         FROM portal_data.datasets
         WHERE deleted_at IS NULL
           AND LOWER(nama_dataset) = LOWER($1)
         LIMIT 1`,
        [nama]
      )
    ).rowCount > 0;

  return { nama_dataset: nama, isAvailable: !exists };
}

// =========================
// CREATE (TRANSACTION) + CREATE TABLE FISIK
// =========================
async function create(db, payload, reqUser) {
  const { bidangId, createdBy } = assertUserContext(reqUser);

  const meta = payload?.metadata || {};
  const cols = Array.isArray(payload?.columns) ? payload.columns : [];

  const namaDataset = String(pickMeta(meta, "nama_dataset", "nama_data")).trim();
  const deskripsiDataset = String(pickMeta(meta, "deskripsi_dataset", "definisi")).trim();

  const jenisData = mapJenisData(pickMeta(meta, "jenis_data"));
  const accessLevel = mapAccessLevel(pickMeta(meta, "access_level", "hak_akses"));
  const spasialStatus = mapSpasial(pickMeta(meta, "spasial", "spasial_status"));

  const periodePemutakhiran = mapPeriodePemutakhiran(pickMeta(meta, "periode_pemutakhiran"));
  const kontakBidang = String(pickMeta(meta, "kontak", "kontak_bidang")).trim();
  const topikData = String(pickMeta(meta, "topik", "topik_data")).trim();
  const sumberData = String(pickMeta(meta, "sumber_data_detail", "sumber_data")).trim();

  const ukuranData = String(pickMeta(meta, "ukuran", "ukuran_data")).trim();
  const satuanData = String(pickMeta(meta, "satuan", "satuan_data")).trim();

  // produsen data authoritative dari BE
  const produsenData = "PUSDATIN_DPRKP";

  // ===== validasi meta =====
  if (!namaDataset) throw Object.assign(new Error("Nama dataset wajib diisi."), { code: "P0001" });
  if (!deskripsiDataset) throw Object.assign(new Error("Deskripsi/Definisi dataset wajib diisi."), { code: "P0001" });
  if (!jenisData) throw Object.assign(new Error("jenis_data wajib: TERSTRUKTUR / TIDAK_TERSTRUKTUR"), { code: "P0001" });
  if (!accessLevel) throw Object.assign(new Error("hak_akses wajib: TERBUKA / TERBATAS / RAHASIA"), { code: "P0001" });
  if (!periodePemutakhiran) throw Object.assign(new Error("periode_pemutakhiran wajib sesuai opsi yang diizinkan."), { code: "P0001" });
  if (!spasialStatus) throw Object.assign(new Error("spasial wajib: SPASIAL / NON_SPASIAL"), { code: "P0001" });

  // kategori sesuai jenis_data
  let sdiStatus = "NON_SDI";
  let dssdStatus = "NON_DSSD";

  if (jenisData === "TERSTRUKTUR") {
    const sdi = mapSdiStatus(pickMeta(meta, "kategori_data", "sdi_status"));
    if (!sdi) throw Object.assign(new Error("Untuk TERSTRUKTUR, kategori_data wajib: SDI / NON_SDI"), { code: "P0001" });
    sdiStatus = sdi;
    dssdStatus = "NON_DSSD";
  } else {
    const dssd = mapDssdStatus(pickMeta(meta, "kategori_data", "dssd_status"));
    if (!dssd) throw Object.assign(new Error("Untuk TIDAK_TERSTRUKTUR, kategori_data wajib: DSSD / NON_DSSD"), { code: "P0001" });
    dssdStatus = dssd;
    sdiStatus = "NON_SDI";
  }

  // columns clean
  const cleanedCols = cols
    .map((c, idx) => {
      const rawName = c?.nama_kolom ?? c?.name ?? "";
      const rawDesc = c?.definisi_kolom ?? c?.desc ?? "";

      const nama_kolom = formatHeader(rawName);
      if (!nama_kolom) return null;

      const definisi_kolom = String(rawDesc ?? "").trim() || "-";
      const nama_tampilan = String(c?.nama_tampilan ?? "").trim() || nama_kolom;
      const urutan = Number.isFinite(Number(c?.urutan)) ? Number(c.urutan) : idx + 1;

      return {
        nama_kolom,
        nama_tampilan,
        definisi_kolom,
        nullable: typeof c?.nullable === "boolean" ? c.nullable : true,
        aturan_validasi: c?.aturan_validasi ? String(c.aturan_validasi) : null,
        contoh_nilai: c?.contoh_nilai ? String(c.contoh_nilai) : null,
        urutan,
        is_active: typeof c?.is_active === "boolean" ? c.is_active : true,
      };
    })
    .filter(Boolean);

  if (!cleanedCols.length) throw Object.assign(new Error("columns wajib diisi minimal 1 kolom."), { code: "P0001" });
  if (!cleanedCols.some((c) => c.nama_kolom === "PERIODE_DATA"))
    throw Object.assign(new Error("Kolom wajib PERIODE_DATA belum ada."), { code: "P0001" });

  // unik nama kolom
  const setNames = new Set();
  for (const c of cleanedCols) {
    if (setNames.has(c.nama_kolom))
      throw Object.assign(new Error(`Duplikat nama_kolom: ${c.nama_kolom}`), { code: "P0001" });
    setNames.add(c.nama_kolom);
  }

  // unik global nama dataset
  const exists =
    (
      await db.query(
        `SELECT 1 FROM portal_data.datasets
         WHERE deleted_at IS NULL AND LOWER(nama_dataset)=LOWER($1)
         LIMIT 1`,
        [namaDataset]
      )
    ).rowCount > 0;

  if (exists) throw Object.assign(new Error("Nama dataset sudah digunakan (unik global)."), { code: "P0001" });

  // aturan baru: tipe fisik
  const isTerstruktur = jenisData === "TERSTRUKTUR";
  const physicalType = isTerstruktur ? "VARCHAR(100)" : "TEXT";
  const forcedTipeData = isTerstruktur ? "varchar" : "text";
  const forcedPanjang = isTerstruktur ? 100 : null;

  // =========================
  // TRANSACTION (db dari runWithContext)
  // =========================
  try {
    await db.query("BEGIN");

    // insert datasets
    const dsIns = await db.query(
      `INSERT INTO portal_data.datasets (
         bidang_id, nama_dataset, deskripsi_dataset, produsen_data,
         jenis_data, periode_pemutakhiran, status, created_by,
         sdi_status, dssd_status, access_level,
         ukuran_data, satuan_data, kontak_bidang, topik_data, sumber_data,
         spasial_status
       )
       VALUES (
         $1::int4, $2::text, $3::text, $4::text,
         $5::text, $6::text, 'DRAFT'::portal_data.dataset_status, $7::uuid,
         $8::portal_data.dataset_sdi_status, $9::portal_data.dataset_dssd_status, $10::portal_data.dataset_access_level,
         $11::text, $12::text, $13::text, $14::text, $15::text,
         $16::text
       )
       RETURNING dataset_id`,
      [
        bidangId,
        namaDataset,
        deskripsiDataset,
        produsenData,
        jenisData,
        periodePemutakhiran,
        createdBy,
        sdiStatus,
        dssdStatus,
        accessLevel,
        ukuranData || null,
        satuanData || null,
        kontakBidang || null,
        topikData || null,
        sumberData || null,
        spasialStatus,
      ]
    );

    const datasetId = dsIns.rows[0].dataset_id;

    // insert dataset_columns (dipaksa sesuai aturan baru)
    for (const c of cleanedCols) {
      await db.query(
        `INSERT INTO portal_data.dataset_columns (
           dataset_id, nama_kolom, nama_tampilan, definisi_kolom,
           tipe_data, nullable, panjang_maks,
           aturan_validasi, contoh_nilai, urutan, is_active
         )
         VALUES (
           $1::uuid, $2::text, $3::text, $4::text,
           $5::text, $6::bool, $7::int4,
           $8::text, $9::text, $10::int4, $11::bool
         )`,
        [
          datasetId,
          c.nama_kolom,
          c.nama_tampilan,
          c.definisi_kolom,
          forcedTipeData,
          c.nullable,
          forcedPanjang,
          c.aturan_validasi,
          c.contoh_nilai,
          c.urutan,
          c.is_active,
        ]
      );
    }

    // create tabel fisik
    const physicalTable = makePhysicalTableName(datasetId);

    const colsDDL = cleanedCols
      .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
      .map((c) => `"${c.nama_kolom}" ${physicalType}`)
      .join(",\n  ");

    await db.query(`
      CREATE TABLE IF NOT EXISTS portal_data."${physicalTable}" (
        id BIGSERIAL PRIMARY KEY,
        ${colsDDL},
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.query("COMMIT");

    const out = await detail(db, datasetId);
    return {
      ...out,
      physical_table: `portal_data.${physicalTable}`,
      physical_type: physicalType,
    };
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
}

// =========================
// PREVIEW (TERSTRUKTUR ONLY)
// =========================
async function preview(db, datasetId, query) {
  const limit = Math.min(200, Math.max(1, Number(query?.limit || 50)));
  const offset = Math.max(0, Number(query?.offset || 0));

  const ds = (
    await db.query(
      `SELECT dataset_id, nama_dataset, jenis_data, status
       FROM portal_data.datasets
       WHERE dataset_id = $1::uuid AND deleted_at IS NULL`,
      [datasetId]
    )
  ).rows[0];

  if (!ds) throw Object.assign(new Error("Dataset not found."), { code: "P0001" });
  if (normUpper(ds.jenis_data) !== "TERSTRUKTUR")
    throw Object.assign(new Error("Preview hanya tersedia untuk dataset TERSTRUKTUR."), { code: "P0001" });

  const total =
    (
      await db.query(
        `SELECT COUNT(*)::int AS total
         FROM portal_data.dataset_records
         WHERE dataset_id = $1::uuid`,
        [datasetId]
      )
    ).rows[0]?.total ?? 0;

  const items = (
    await db.query(
      `SELECT record_id, record_data, created_at
       FROM portal_data.dataset_records
       WHERE dataset_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [datasetId, limit, offset]
    )
  ).rows;

  return { dataset: ds, items, pagination: { limit, offset, total } };
}

// =========================
// TEMPLATE CSV (TERSTRUKTUR ONLY)
// =========================
async function buildTemplateCsv(db, datasetId) {
  const ds = (
    await db.query(
      `SELECT dataset_id, nama_dataset, jenis_data
       FROM portal_data.datasets
       WHERE dataset_id = $1::uuid AND deleted_at IS NULL`,
      [datasetId]
    )
  ).rows[0];

  if (!ds) throw Object.assign(new Error("Dataset not found."), { code: "P0001" });
  if (normUpper(ds.jenis_data) !== "TERSTRUKTUR")
    throw Object.assign(new Error("Template CSV hanya tersedia untuk dataset TERSTRUKTUR."), { code: "P0001" });

  const cols = (
    await db.query(
      `SELECT nama_kolom
       FROM portal_data.dataset_columns
       WHERE dataset_id = $1::uuid AND is_active = true
       ORDER BY urutan ASC NULLS LAST, nama_kolom ASC`,
      [datasetId]
    )
  ).rows.map((r) => r.nama_kolom);

  if (!cols.length)
    throw Object.assign(
      new Error("Dataset columns kosong. Silakan definisikan dataset_columns terlebih dahulu."),
      { code: "P0001" }
    );

  return cols.map(csvEscape).join(",") + "\n";
}

// =========================
// WORKFLOW STATUS (FN_*)
// =========================
async function submit(db, datasetId) {
  const r = await db.query(`SELECT * FROM portal_data.fn_submit_dataset($1::uuid)`, [datasetId]);
  return r.rows[0];
}

async function revise(db, datasetId) {
  const r = await db.query(`SELECT * FROM portal_data.fn_revise_dataset($1::uuid)`, [datasetId]);
  return r.rows[0];
}

async function approveKabid(db, datasetId) {
  const r = await db.query(`SELECT * FROM portal_data.fn_approve_kabid($1::uuid)`, [datasetId]);
  return r.rows[0];
}

async function rejectKabid(db, datasetId, reason) {
  const r = await db.query(
    `SELECT * FROM portal_data.fn_reject_kabid($1::uuid, $2::text)`,
    [datasetId, reason]
  );
  return r.rows[0];
}

async function verifyPusdatin(db, datasetId) {
  const r = await db.query(`SELECT * FROM portal_data.fn_verify_pusdatin($1::uuid)`, [datasetId]);
  return r.rows[0];
}

async function rejectPusdatin(db, datasetId, reason) {
  const r = await db.query(
    `SELECT * FROM portal_data.fn_reject_pusdatin($1::uuid, $2::text)`,
    [datasetId, reason]
  );
  return r.rows[0];
}

module.exports = {
  list,
  detail,
  checkName,
  create,
  preview,
  buildTemplateCsv,
  submit,
  revise,
  approveKabid,
  rejectKabid,
  verifyPusdatin,
  rejectPusdatin,
};