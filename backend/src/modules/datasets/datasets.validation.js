// src/modules/datasets/datasets.validation.js

const ACCESS_LEVEL = new Set(["TERBUKA", "TERBATAS", "TERTUTUP"]);
const JENIS_DATA = new Set(["TERSTRUKTUR", "TIDAK_TERSTRUKTUR"]);
const SDI_STATUS = new Set(["SDI", "NON_SDI"]);
const DSSD_STATUS = new Set(["DSSD", "NON_DSSD"]);
const SPASIAL = new Set(["SPASIAL", "NON_SPASIAL"]);

function vError(message, details = null) {
  const e = new Error(message);
  e.isValidation = true;
  e.details = details;
  return e;
}

function asStr(x) {
  return x === null || x === undefined ? "" : String(x);
}
function trimOrEmpty(x) {
  return asStr(x).trim();
}
function upperUnderscore(v) {
  return asStr(v)
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// FE punya field: nama_data/definisi/hak_akses/jenis_data/kategori_data/spasial/...
function normalizeMeta(body) {
  const meta = body?.metadata || {};
  return {
    nama_dataset: trimOrEmpty(meta.nama_dataset || meta.nama_data || ""),
    deskripsi_dataset: trimOrEmpty(meta.deskripsi_dataset || meta.definisi || ""),
    access_level: upperUnderscore(meta.access_level || meta.hak_akses || ""),
    jenis_data: upperUnderscore(meta.jenis_data || meta.jenisData || ""),
    // kategori turunan: SDI/NON_SDI atau DSSD/NON_DSSD
    kategori_data: upperUnderscore(meta.kategori_data || meta.kategoriTurunan || ""),
    spasial_status: upperUnderscore(meta.spasial_status || meta.spasial || ""),
    produsen_data: trimOrEmpty(meta.produsen_data || meta.produsenData || ""),
    periode_pemutakhiran: upperUnderscore(meta.periode_pemutakhiran || meta.periodePemutakhiran || ""),
    kontak_bidang: trimOrEmpty(meta.kontak_bidang || meta.kontak || ""),
    topik_data: trimOrEmpty(meta.topik_data || meta.topik || ""),
    sumber_data: trimOrEmpty(meta.sumber_data || meta.sumber_data_detail || meta.sumberDataDetail || ""),
    ukuran_data: trimOrEmpty(meta.ukuran_data || meta.ukuran || ""),
    satuan_data: trimOrEmpty(meta.satuan_data || meta.satuan || ""),
  };
}

function normalizeColumns(body) {
  const cols = Array.isArray(body?.columns) ? body.columns : [];
  return cols.map((c, idx) => ({
    nama_kolom: upperUnderscore(c.nama_kolom || c.name || ""),
    definisi_kolom: trimOrEmpty(c.definisi_kolom || c.desc || ""),
    urutan: Number.isFinite(c.urutan) ? c.urutan : idx + 1,
  }));
}

exports.validateCheckName = (body) => {
  const nama_dataset = trimOrEmpty(body?.nama_dataset || body?.nama_data || "");
  if (!nama_dataset) throw vError("nama_dataset wajib diisi");
  if (nama_dataset.length < 3) throw vError("nama_dataset terlalu pendek (min 3 karakter)");
  return { nama_dataset };
};

exports.validateCreateDataset = (body, user) => {
  const meta = normalizeMeta(body);
  const columns = normalizeColumns(body);

  const details = {};

  if (!meta.nama_dataset) details.nama_dataset = "wajib diisi";
  if (!meta.deskripsi_dataset) details.deskripsi_dataset = "wajib diisi";
  if (!meta.produsen_data) details.produsen_data = "wajib diisi (auto dari user/login)";

  if (!ACCESS_LEVEL.has(meta.access_level)) details.access_level = `harus: ${Array.from(ACCESS_LEVEL).join(", ")}`;
  if (!JENIS_DATA.has(meta.jenis_data)) details.jenis_data = `harus: ${Array.from(JENIS_DATA).join(", ")}`;

  // hirarki kategori sesuai jenis_data
  if (meta.jenis_data === "TERSTRUKTUR") {
    if (!SDI_STATUS.has(meta.kategori_data)) details.kategori_data = `untuk TERSTRUKTUR harus: ${Array.from(SDI_STATUS).join(", ")}`;
  } else if (meta.jenis_data === "TIDAK_TERSTRUKTUR") {
    if (!DSSD_STATUS.has(meta.kategori_data)) details.kategori_data = `untuk TIDAK_TERSTRUKTUR harus: ${Array.from(DSSD_STATUS).join(", ")}`;
  }

  if (!SPASIAL.has(meta.spasial_status)) details.spasial_status = `harus: ${Array.from(SPASIAL).join(", ")}`;

  if (!Array.isArray(columns) || columns.length === 0) details.columns = "minimal 1 kolom";
  const hasPeriode = columns.some((c) => c.nama_kolom === "PERIODE_DATA");
  if (!hasPeriode) details.columns_periode = "wajib ada kolom PERIODE_DATA";

  const emptyCols = columns.filter((c) => !c.nama_kolom);
  if (emptyCols.length) details.columns_empty = "ada nama_kolom kosong";

  // user minimal: id + bidang_id
  if (!user?.id) details.user_id = "missing";
  if (user?.bidang_id === undefined || user?.bidang_id === null) details.bidang_id = "missing";

  if (Object.keys(details).length) throw vError("Validasi gagal", details);

  return { metadata: meta, columns };
};

exports.validateRevise = (body) => {
  // opsional: alasan revisi
  const alasan = trimOrEmpty(body?.alasan || body?.reason || "");
  return { alasan };
};