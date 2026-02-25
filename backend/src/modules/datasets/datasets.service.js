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

// status yang boleh diedit metadata
function canEditStatus(status) {
  const s = normUpper(status);
  if (s === "DRAFT") return true;
  if (s.startsWith("REJECTED")) return true; // REJECTED_KABID / REJECTED_PUSDATIN
  return false;
}

// =========================
// LIST (RBAC applied here)
// =========================
async function list(db, query, reqUser) {
  const { status, q, page = 1, limit = 10 } = query;

  // ---- RBAC ----
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

  if (!canSeeAll && !isBidangLike) {
    if (bidangId) {
      // treat like bidang
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

  // ✅ supaya FE gampang: dataset langsung berisi field2 penting (jenis_data, status, access_level, dll)
  return { ...ds, columns, active_file: null, stats };
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
  if (!periodePemutakhiran)
    throw Object.assign(new Error("periode_pemutakhiran wajib sesuai opsi yang diizinkan."), { code: "P0001" });
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
    if (setNames.has(c.nama_kolom)) throw Object.assign(new Error(`Duplikat nama_kolom: ${c.nama_kolom}`), { code: "P0001" });
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
// UPDATE METADATA + COLUMNS (TRANSACTION)
// - status harus DRAFT / REJECTED_*
// - RBAC: BIDANG hanya dataset bidang sendiri, PUSDATIN boleh semua
// - jenis_data tidak boleh berubah (untuk menjaga tabel fisik)
// - kolom yang hilang -> is_active=false (bukan delete)
// - kolom baru -> insert + ALTER TABLE add column
// - rename nama_kolom existing -> ditolak (buat kolom baru)
// =========================
async function update(db, datasetId, payload, reqUser) {
  const { bidangId, createdBy } = assertUserContext(reqUser);

  const isBidangLike = hasRole(reqUser, "BIDANG") || hasRole(reqUser, "KEPALA_BIDANG");
  const canSeeAll = hasRole(reqUser, "PUSDATIN") || hasRole(reqUser, "KEPALA_PUSDATIN");

  const meta = payload?.metadata || {};
  const cols = Array.isArray(payload?.columns) ? payload.columns : [];

  // ambil dataset + lock
  const ds = (
    await db.query(
      `SELECT dataset_id, bidang_id, nama_dataset, jenis_data, status, deleted_at
       FROM portal_data.datasets
       WHERE dataset_id=$1::uuid AND deleted_at IS NULL
       FOR UPDATE`,
      [datasetId]
    )
  ).rows[0];

  if (!ds) throw Object.assign(new Error("Dataset not found."), { code: "P0001" });
  if (!canEditStatus(ds.status))
    throw Object.assign(new Error(`Dataset status "${ds.status}" tidak bisa diedit.`), { code: "P0001" });

  // RBAC edit
  if (!canSeeAll && isBidangLike) {
    if (Number(ds.bidang_id) !== Number(bidangId)) {
      throw Object.assign(new Error("Tidak punya akses edit dataset bidang lain."), { code: "P0001" });
    }
  }

  // NOTE: jenis_data tidak boleh berubah
  const incomingJenis = mapJenisData(pickMeta(meta, "jenis_data"));
  if (incomingJenis && normUpper(incomingJenis) !== normUpper(ds.jenis_data)) {
    throw Object.assign(new Error("jenis_data tidak boleh diubah setelah dataset dibuat."), { code: "P0001" });
  }

  const jenisData = normUpper(ds.jenis_data);
  const isTerstruktur = jenisData === "TERSTRUKTUR";

  // physical type mengikuti jenis_data existing
  const physicalType = isTerstruktur ? "VARCHAR(100)" : "TEXT";
  const forcedTipeData = isTerstruktur ? "varchar" : "text";
  const forcedPanjang = isTerstruktur ? 100 : null;

  // meta mapping (sama seperti create)
  const namaDataset = String(pickMeta(meta, "nama_dataset", "nama_data", "nama_dataset_baru")).trim();
  const deskripsiDataset = String(pickMeta(meta, "deskripsi_dataset", "definisi")).trim();

  const accessLevel = mapAccessLevel(pickMeta(meta, "access_level", "hak_akses"));
  const spasialStatus = mapSpasial(pickMeta(meta, "spasial", "spasial_status"));
  const periodePemutakhiran = mapPeriodePemutakhiran(pickMeta(meta, "periode_pemutakhiran"));

  const kontakBidang = String(pickMeta(meta, "kontak", "kontak_bidang")).trim();
  const topikData = String(pickMeta(meta, "topik", "topik_data")).trim();
  const sumberData = String(pickMeta(meta, "sumber_data_detail", "sumber_data")).trim();
  const ukuranData = String(pickMeta(meta, "ukuran", "ukuran_data")).trim();
  const satuanData = String(pickMeta(meta, "satuan", "satuan_data")).trim();

  // validasi minimal
  if (!namaDataset) throw Object.assign(new Error("Nama dataset wajib diisi."), { code: "P0001" });
  if (!deskripsiDataset) throw Object.assign(new Error("Deskripsi/Definisi dataset wajib diisi."), { code: "P0001" });
  if (!accessLevel) throw Object.assign(new Error("hak_akses wajib: TERBUKA / TERBATAS / RAHASIA"), { code: "P0001" });
  if (!periodePemutakhiran)
    throw Object.assign(new Error("periode_pemutakhiran wajib sesuai opsi yang diizinkan."), { code: "P0001" });
  if (!spasialStatus) throw Object.assign(new Error("spasial wajib: SPASIAL / NON_SPASIAL"), { code: "P0001" });

  // kategori sesuai jenis_data
  let sdiStatus = "NON_SDI";
  let dssdStatus = "NON_DSSD";

  if (isTerstruktur) {
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

  // columns clean (boleh update definisi, urutan, is_active, dll)
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
        column_id: c?.column_id ?? c?.id ?? null,
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
    if (setNames.has(c.nama_kolom)) throw Object.assign(new Error(`Duplikat nama_kolom: ${c.nama_kolom}`), { code: "P0001" });
    setNames.add(c.nama_kolom);
  }

  // cek unik global nama dataset (kecuali dirinya sendiri)
  const dup =
    (
      await db.query(
        `SELECT 1
         FROM portal_data.datasets
         WHERE deleted_at IS NULL
           AND LOWER(nama_dataset)=LOWER($1)
           AND dataset_id <> $2::uuid
         LIMIT 1`,
        [namaDataset, datasetId]
      )
    ).rowCount > 0;
  if (dup) throw Object.assign(new Error("Nama dataset sudah digunakan (unik global)."), { code: "P0001" });

  // ambil existing columns
  const existingCols = (
    await db.query(
      `SELECT column_id, nama_kolom
       FROM portal_data.dataset_columns
       WHERE dataset_id=$1::uuid`,
      [datasetId]
    )
  ).rows;

  const existingByName = new Map(existingCols.map((r) => [String(r.nama_kolom), r]));
  const incomingNames = new Set(cleanedCols.map((c) => c.nama_kolom));

  // rename detection (kalau FE kirim column_id tapi nama berubah)
  // -> kita blok rename agar tidak merusak tabel fisik
  const existingById = new Map(existingCols.map((r) => [String(r.column_id), r]));
  for (const c of cleanedCols) {
    if (c.column_id) {
      const old = existingById.get(String(c.column_id));
      if (old && String(old.nama_kolom) !== String(c.nama_kolom)) {
        throw Object.assign(
          new Error(`Rename kolom tidak diizinkan: "${old.nama_kolom}" -> "${c.nama_kolom}". Buat kolom baru saja.`),
          { code: "P0001" }
        );
      }
    }
  }

  // physical table
  const physicalTable = makePhysicalTableName(datasetId);

  try {
    await db.query("BEGIN");

    // update datasets
    await db.query(
      `UPDATE portal_data.datasets
       SET
         nama_dataset = $2::text,
         deskripsi_dataset = $3::text,
         access_level = $4::portal_data.dataset_access_level,
         periode_pemutakhiran = $5::text,
         spasial_status = $6::text,
         sdi_status = $7::portal_data.dataset_sdi_status,
         dssd_status = $8::portal_data.dataset_dssd_status,
         kontak_bidang = $9::text,
         topik_data = $10::text,
         sumber_data = $11::text,
         ukuran_data = $12::text,
         satuan_data = $13::text,
         updated_at = NOW(),
         updated_by = $14::uuid
       WHERE dataset_id = $1::uuid`,
      [
        datasetId,
        namaDataset,
        deskripsiDataset,
        accessLevel,
        periodePemutakhiran,
        spasialStatus,
        sdiStatus,
        dssdStatus,
        kontakBidang || null,
        topikData || null,
        sumberData || null,
        ukuranData || null,
        satuanData || null,
        createdBy,
      ]
    );

    // 1) Nonaktifkan kolom yang tidak ada di payload (soft)
    for (const ex of existingCols) {
      if (!incomingNames.has(String(ex.nama_kolom))) {
        await db.query(
          `UPDATE portal_data.dataset_columns
           SET is_active=false
           WHERE column_id=$1::uuid`,
          [ex.column_id]
        );
      }
    }

    // 2) Upsert: update yang sudah ada, insert yang baru
    for (const c of cleanedCols) {
      const ex = existingByName.get(String(c.nama_kolom));

      if (ex) {
        // update existing
        await db.query(
          `UPDATE portal_data.dataset_columns
           SET
             nama_tampilan = $2::text,
             definisi_kolom = $3::text,
             tipe_data = $4::text,
             nullable = $5::bool,
             panjang_maks = $6::int4,
             aturan_validasi = $7::text,
             contoh_nilai = $8::text,
             urutan = $9::int4,
             is_active = $10::bool
           WHERE column_id = $1::uuid`,
          [
            ex.column_id,
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
      } else {
        // insert new
        const ins = await db.query(
          `INSERT INTO portal_data.dataset_columns (
             dataset_id, nama_kolom, nama_tampilan, definisi_kolom,
             tipe_data, nullable, panjang_maks,
             aturan_validasi, contoh_nilai, urutan, is_active
           )
           VALUES (
             $1::uuid, $2::text, $3::text, $4::text,
             $5::text, $6::bool, $7::int4,
             $8::text, $9::text, $10::int4, $11::bool
           )
           RETURNING column_id`,
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

        // ALTER TABLE add column fisik (kalau belum ada)
        // aman: IF NOT EXISTS
        await db.query(
          `ALTER TABLE portal_data."${physicalTable}"
           ADD COLUMN IF NOT EXISTS "${c.nama_kolom}" ${physicalType}`,
          []
        );
      }
    }

    await db.query("COMMIT");

    return await detail(db, datasetId);
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
}

// =========================
// PREVIEW (TERSTRUKTUR ONLY) - dari tabel fisik ds_*
// exclude: id, created_at
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
  if (String(ds.jenis_data || "").toUpperCase() !== "TERSTRUKTUR")
    throw Object.assign(new Error("Preview hanya tersedia untuk dataset TERSTRUKTUR."), { code: "P0001" });

  // ambil kolom aktif dari dataset_columns (urutan sesuai definisi)
  const cols = (
    await db.query(
      `SELECT nama_kolom
       FROM portal_data.dataset_columns
       WHERE dataset_id=$1::uuid AND COALESCE(is_active,true)=true
       ORDER BY urutan ASC NULLS LAST, nama_kolom ASC`,
      [datasetId]
    )
  ).rows.map((r) => r.nama_kolom);

  if (!cols.length)
    throw Object.assign(new Error("Dataset columns kosong."), { code: "P0001" });

  const physicalTable = makePhysicalTableName(datasetId); // ds_<uuidnodash>

  // total row
  const total =
    (
      await db.query(
        `SELECT COUNT(*)::int AS total
         FROM portal_data."${physicalTable}"`,
        []
      )
    ).rows[0]?.total ?? 0;

  // query data (exclude id, created_at otomatis karena kita select hanya cols)
  const colSql = cols.map((c) => `"${c}"`).join(", ");

  const rows = (
    await db.query(
      `
      SELECT ${colSql}
      FROM portal_data."${physicalTable}"
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    )
  ).rows;

  return {
    dataset: ds,
    columns: cols,                 // ✅ FE butuh ini
    rows,                          // ✅ FE butuh ini
    pagination: { limit, offset, total },
    source: { table: `portal_data.${physicalTable}` },
  };
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
    throw Object.assign(new Error("Dataset columns kosong. Silakan definisikan dataset_columns terlebih dahulu."), {
      code: "P0001",
    });

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
  const r = await db.query(`SELECT * FROM portal_data.fn_reject_kabid($1::uuid, $2::text)`, [datasetId, reason]);
  return r.rows[0];
}

async function verifyPusdatin(db, datasetId) {
  const r = await db.query(`SELECT * FROM portal_data.fn_verify_pusdatin($1::uuid)`, [datasetId]);
  return r.rows[0];
}

async function rejectPusdatin(db, datasetId, reason) {
  const r = await db.query(`SELECT * FROM portal_data.fn_reject_pusdatin($1::uuid, $2::text)`, [datasetId, reason]);
  return r.rows[0];
}

module.exports = {
  list,
  detail,
  checkName,
  create,
  update,            // ✅ TAMBAHAN PENTING
  preview,
  buildTemplateCsv,
  submit,
  revise,
  approveKabid,
  rejectKabid,
  verifyPusdatin,
  rejectPusdatin,
};