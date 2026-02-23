// src/pages/CreateDatasetPage.jsx
import { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import { useNavigate } from "react-router-dom";

const NAVY = "#0B3A53";

/**
 * ✅ Radius lebih “wajar”
 */
const R_PANEL = 12; // panel kiri/kanan
const R_CARD = 10; // card kecil di kanan
const R_INPUT = 10; // input/select
const R_BTN = 10; // button/chip

/**
 * ✅ ENUM sesuai DB
 * access_level: TERBUKA, TERBATAS, RAHASIA
 */
const OPT_HAK_AKSES = ["TERBUKA", "TERBATAS", "RAHASIA"];
const OPT_JENIS = ["TERSTRUKTUR", "TIDAK_TERSTRUKTUR"];

/**
 * ✅ PERIODE sesuai CHECK constraint (pakai spasi)
 */
const OPT_PERIODE = [
  "1 MINGGU SEKALI",
  "1 BULAN SEKALI",
  "3 BULAN SEKALI",
  "6 BULAN SEKALI",
  "1 TAHUN SEKALI",
  "5 TAHUN SEKALI",
];

const OPT_KATEGORI_TERSTRUKTUR = ["SDI", "NON_SDI"];
const OPT_KATEGORI_TIDAK_TERSTRUKTUR = ["DSSD", "NON_DSSD"];
const OPT_SPASIAL = ["SPASIAL", "NON_SPASIAL"];

// ✅ baseURL FE dari .env (contoh: http://localhost:5000/api)
const API_BASE = import.meta.env.VITE_API_BASE_URL;

// ✅ Ambil token
function getToken() {
  return localStorage.getItem("pd_access_token") || localStorage.getItem("accessToken") || "";
}

// UPPERCASE + spasi => _ + hanya A-Z0-9_ + trim underscore
function formatHeader(v) {
  return String(v || "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Ambil pesan error yang aman
function extractErrorMessage(json, fallback) {
  if (!json) return fallback;
  if (typeof json === "string") return json;
  return (
    json?.message ||
    json?.error?.message ||
    json?.error ||
    json?.msg ||
    fallback
  );
}

/**
 * ✅ Style konsisten untuk TextField / Select
 */
const tfSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: `${R_INPUT}px !important`,
    bgcolor: "#fff",
  },
};

const selectSx = {
  borderRadius: `${R_INPUT}px !important`,
  bgcolor: "#fff",
};

export default function CreateDatasetPage() {
  const nav = useNavigate();

  // =========================
  // METADATA STATE
  // =========================
  const [namaData, setNamaData] = useState("");
  const [definisi, setDefinisi] = useState("");
  const [hakAkses, setHakAkses] = useState("");
  const [jenisData, setJenisData] = useState("");
  const [kategoriTurunan, setKategoriTurunan] = useState("");
  const [spasial, setSpasial] = useState("");
  const [periodePemutakhiran, setPeriodePemutakhiran] = useState("");
  const [kontak, setKontak] = useState("");
  const [topik, setTopik] = useState("");
  const [sumberDataDetail, setSumberDataDetail] = useState("");
  const [ukuran, setUkuran] = useState("");
  const [satuan, setSatuan] = useState("");

  const [produsenData, setProdusenData] = useState("");
  const [cekNamaStatus, setCekNamaStatus] = useState("BELUM_DICEK"); // BELUM_DICEK | VALID | DUPLIKAT
  const [checkingName, setCheckingName] = useState(false);

  // =========================
  // UI STATE
  // =========================
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    severity: "info", // success | error | warning | info
    message: "",
  });

  const showToast = (severity, message) => {
    const msg =
      typeof message === "string"
        ? message
        : message?.message
        ? String(message.message)
        : JSON.stringify(message);
    setToast({ open: true, severity, message: msg });
  };

  const closeToast = () => setToast((p) => ({ ...p, open: false }));

  // set default produsen
  useEffect(() => {
    setProdusenData("PUSDATIN_DPRKP");
  }, []);

  // Reset ketika jenis berubah
  useEffect(() => {
    setKategoriTurunan("");
    setSpasial("");
  }, [jenisData]);

  // Reset status cek nama kalau nama berubah
  useEffect(() => {
    setCekNamaStatus("BELUM_DICEK");
  }, [namaData]);

  const opsiKategoriTurunan = useMemo(() => {
    if (jenisData === "TERSTRUKTUR") return OPT_KATEGORI_TERSTRUKTUR;
    if (jenisData === "TIDAK_TERSTRUKTUR") return OPT_KATEGORI_TIDAK_TERSTRUKTUR;
    return [];
  }, [jenisData]);

  // =========================
  // COLUMN STATE
  // =========================
  const [columns, setColumns] = useState([
    {
      key: "col-1",
      name: "PERIODE_DATA",
      desc: "PERIODE_DATA (CONTOH: 2026-02)",
    },
  ]);

  const handleAddColumn = () => {
    setColumns((prev) => [
      ...prev,
      { key: `col-${Date.now()}`, name: "", desc: "" },
    ]);
  };

  const handleRemoveColumn = (key) => {
    setColumns((prev) => prev.filter((c) => c.key !== key));
  };

  const handleUpdateColumn = (key, patch) => {
    setColumns((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c))
    );
  };

  // =========================
  // VALIDATION HELPERS
  // =========================
  const validateBeforeSave = () => {
    if (!namaData.trim()) return "Nama data wajib diisi.";
    if (namaData.trim().length < 3) return "Nama data minimal 3 karakter.";
    if (!definisi.trim()) return "Definisi wajib diisi.";
    if (!hakAkses) return "Hak akses wajib dipilih.";
    if (!jenisData) return "Jenis data wajib dipilih.";
    if (!kategoriTurunan) return "Kategori turunan wajib dipilih.";
    if (!spasial) return "Spasial wajib dipilih.";
    if (!periodePemutakhiran) return "Periode pemutakhiran wajib dipilih.";

    if (cekNamaStatus !== "VALID") {
      return "Silakan CEK DATA terlebih dahulu sampai status VALID.";
    }

    const cleaned = columns
      .map((c, idx) => ({
        name: formatHeader(c.name),
        desc: String(c.desc || "").trim(),
        urutan: idx + 1,
      }))
      .filter((c) => c.name);

    if (cleaned.length < 1) return "Minimal 1 kolom wajib diisi.";
    if (!cleaned.some((c) => c.name === "PERIODE_DATA"))
      return "Kolom wajib PERIODE_DATA belum ada.";

    const anyEmptyDesc = cleaned.some((c) => !c.desc);
    if (anyEmptyDesc) return "Deskripsi kolom ada yang kosong. Mohon lengkapi.";

    const seen = new Set();
    for (const c of cleaned) {
      if (seen.has(c.name)) return `Duplikat nama kolom: ${c.name}`;
      seen.add(c.name);
    }

    return "";
  };

  // =========================
  // API: CHECK NAME
  // =========================
  const handleCekData = async () => {
    try {
      if (!API_BASE) {
        showToast(
          "error",
          "VITE_API_BASE_URL belum terbaca. Pastikan .env benar lalu restart npm run dev."
        );
        return;
      }

      if (!namaData.trim()) {
        setCekNamaStatus("BELUM_DICEK");
        showToast("warning", "Nama data wajib diisi sebelum cek.");
        return;
      }

      setCheckingName(true);

      const token = getToken();
      const res = await fetch(`${API_BASE}/datasets/check-name`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ nama_dataset: namaData.trim() }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setCekNamaStatus("BELUM_DICEK"); // ✅ jangan jadi DUPLIKAT kalau request error
        const msg = extractErrorMessage(
          json,
          `Gagal cek nama dataset (HTTP ${res.status}).`
        );
        showToast("error", msg);
        return;
      }

      const isAvailable = json?.data?.isAvailable;
      setCekNamaStatus(isAvailable ? "VALID" : "DUPLIKAT");

      if (isAvailable) showToast("success", "Nama dataset tersedia (VALID).");
      else showToast("error", "Nama dataset sudah digunakan (DUPLIKAT).");
    } catch (err) {
      console.error(err);
      setCekNamaStatus("BELUM_DICEK");
      showToast("error", err?.message || "Gagal cek nama dataset.");
    } finally {
      setCheckingName(false);
    }
  };

  // =========================
  // API: SAVE DATASET
  // =========================
  const handleSaveDataset = async () => {
    try {
      if (!API_BASE) {
        showToast(
          "error",
          "VITE_API_BASE_URL belum terbaca. Pastikan .env benar lalu restart npm run dev."
        );
        return;
      }

      const errMsg = validateBeforeSave();
      if (errMsg) {
        showToast("warning", errMsg);
        return;
      }

      setSaving(true);

      const cleanedColumns = columns
        .map((c, i) => ({
          nama_kolom: formatHeader(c.name),
          definisi_kolom: String(c.desc || "").trim(),
          urutan: i + 1,
        }))
        .filter((c) => c.nama_kolom);

      const payload = {
        metadata: {
          nama_data: namaData.trim(),
          definisi: definisi.trim(),
          hak_akses: hakAkses,
          jenis_data: jenisData,
          kategori_data: kategoriTurunan,
          spasial: spasial,
          produsen_data: produsenData || "PUSDATIN_DPRKP",
          periode_pemutakhiran: periodePemutakhiran,
          kontak: kontak.trim(),
          topik: topik.trim(),
          sumber_data_detail: sumberDataDetail.trim(),
          ukuran: ukuran.trim(),
          satuan: satuan.trim(),
        },
        columns: cleanedColumns.map((c) => ({
          nama_kolom: c.nama_kolom,
          definisi_kolom: c.definisi_kolom,
          urutan: c.urutan,
        })),
      };

      const token = getToken();
      const res = await fetch(`${API_BASE}/datasets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = extractErrorMessage(
          json,
          `Gagal simpan dataset (HTTP ${res.status}).`
        );
        throw new Error(msg);
      }

      // ✅ SUKSES: POPUP + AUTO REDIRECT 3 DETIK KE /datasets
      showToast("success", "✅ Data berhasil disimpan. Mengalihkan ke Kumpulan Dataset...");
      setTimeout(() => {
        nav("/datasets", { replace: true, state: { refresh: true } });
      }, 3000);
    } catch (err) {
      console.error(err);
      showToast("error", err?.message || "Gagal simpan dataset.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // PAYLOAD PREVIEW (DEMO)
  // =========================
  const payloadPreview = useMemo(() => {
    return {
      metadata: {
        nama_data: namaData,
        definisi,
        hak_akses: hakAkses,
        jenis_data: jenisData,
        kategori_data: kategoriTurunan,
        spasial,
        produsen_data: produsenData,
        periode_pemutakhiran: periodePemutakhiran,
        kontak,
        topik,
        sumber_data_detail: sumberDataDetail,
        ukuran,
        satuan,
      },
      columns,
    };
  }, [
    namaData,
    definisi,
    hakAkses,
    jenisData,
    kategoriTurunan,
    spasial,
    produsenData,
    periodePemutakhiran,
    kontak,
    topik,
    sumberDataDetail,
    ukuran,
    satuan,
    columns,
  ]);

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto", px: 2 }}>
      {/* TOAST */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={closeToast}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>

      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
          flexWrap: "wrap",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            TAMBAH DATA
          </Typography>
          <Typography sx={{ color: "rgba(2,6,23,0.6)", mt: 0.5 }}>
            API: <b>{API_BASE || "(belum terbaca)"}</b>
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => nav(-1)}
            disabled={saving}
            sx={{
              borderRadius: `${R_BTN}px !important`,
              fontWeight: 800,
              borderColor: "rgba(11,58,83,0.35)",
              color: NAVY,
              "&:hover": { borderColor: NAVY },
              height: 44,
            }}
          >
            KEMBALI
          </Button>

          <Button
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={18} sx={{ color: "#fff" }} />
              ) : (
                <SaveRoundedIcon />
              )
            }
            onClick={handleSaveDataset}
            disabled={saving || checkingName}
            sx={{
              borderRadius: `${R_BTN}px !important`,
              fontWeight: 800,
              bgcolor: NAVY,
              "&:hover": { bgcolor: "#082C41" },
              height: 44,
              opacity: saving ? 0.85 : 1,
            }}
          >
            {saving ? "MENYIMPAN..." : "SIMPAN DATASET"}
          </Button>
        </Stack>
      </Box>

      {/* 2 PANEL */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {/* LEFT PANEL */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: `${R_PANEL}px !important`,
            border: "1px solid rgba(15,23,42,0.10)",
            bgcolor: "#fff",
            boxShadow: "0 8px 24px rgba(2,6,23,0.06)",
          }}
        >
          <Typography sx={{ fontWeight: 900, mb: 2 }}>IDENTITAS DATASET</Typography>

          <Stack spacing={1.6}>
            <TextField
              label="NAMA DATA"
              value={namaData}
              onChange={(e) => setNamaData(e.target.value)}
              fullWidth
              sx={tfSx}
              disabled={saving}
            />

            <Button
              onClick={handleCekData}
              variant="contained"
              disabled={checkingName || saving}
              startIcon={
                checkingName ? (
                  <CircularProgress size={18} sx={{ color: "#fff" }} />
                ) : null
              }
              sx={{
                borderRadius: `${R_BTN}px !important`,
                fontWeight: 800,
                bgcolor: "#2E7D32",
                "&:hover": { bgcolor: "#256628" },
                height: 44,
              }}
            >
              {checkingName ? "MENGECEK..." : "CEK DATA"}
            </Button>

            <Chip
              label={cekNamaStatus}
              variant="outlined"
              sx={{
                borderRadius: `${R_BTN}px !important`,
                width: "fit-content",
                fontWeight: 800,
              }}
              color={
                cekNamaStatus === "VALID"
                  ? "success"
                  : cekNamaStatus === "DUPLIKAT"
                  ? "error"
                  : "default"
              }
            />

            <TextField
              label="DEFINISI"
              value={definisi}
              onChange={(e) => setDefinisi(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              sx={tfSx}
              disabled={saving}
            />

            {/* HAK AKSES */}
            <FormControl fullWidth>
              <Select
                displayEmpty
                value={hakAkses}
                onChange={(e) => setHakAkses(e.target.value)}
                sx={selectSx}
                disabled={saving}
              >
                <MenuItem value="">- PILIH HAK AKSES -</MenuItem>
                {OPT_HAK_AKSES.map((x) => (
                  <MenuItem key={x} value={x}>
                    {x}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* JENIS DATA */}
            <FormControl fullWidth>
              <Select
                displayEmpty
                value={jenisData}
                onChange={(e) => setJenisData(e.target.value)}
                sx={selectSx}
                disabled={saving}
              >
                <MenuItem value="">- PILIH JENIS DATA -</MenuItem>
                {OPT_JENIS.map((x) => (
                  <MenuItem key={x} value={x}>
                    {x}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* KATEGORI TURUNAN */}
            {jenisData && (
              <FormControl fullWidth>
                <Select
                  displayEmpty
                  value={kategoriTurunan}
                  onChange={(e) => setKategoriTurunan(e.target.value)}
                  sx={selectSx}
                  disabled={saving}
                >
                  <MenuItem value="">
                    {jenisData === "TERSTRUKTUR"
                      ? "- PILIH SDI / NON SDI -"
                      : "- PILIH DSSD / NON DSSD -"}
                  </MenuItem>
                  {opsiKategoriTurunan.map((x) => (
                    <MenuItem key={x} value={x}>
                      {x}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* SPASIAL */}
            {kategoriTurunan && (
              <FormControl fullWidth>
                <Select
                  displayEmpty
                  value={spasial}
                  onChange={(e) => setSpasial(e.target.value)}
                  sx={selectSx}
                  disabled={saving}
                >
                  <MenuItem value="">- PILIH SPASIAL / NON SPASIAL -</MenuItem>
                  {OPT_SPASIAL.map((x) => (
                    <MenuItem key={x} value={x}>
                      {x}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="PRODUSEN DATA"
              value={produsenData}
              disabled
              fullWidth
              sx={{
                ...tfSx,
                "& .MuiOutlinedInput-root": {
                  borderRadius: `${R_INPUT}px !important`,
                  bgcolor: "rgba(15,23,42,0.04)",
                },
              }}
            />

            <FormControl fullWidth>
              <Select
                displayEmpty
                value={periodePemutakhiran}
                onChange={(e) => setPeriodePemutakhiran(e.target.value)}
                sx={selectSx}
                disabled={saving}
              >
                <MenuItem value="">- PILIH PERIODE -</MenuItem>
                {OPT_PERIODE.map((x) => (
                  <MenuItem key={x} value={x}>
                    {x}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="KONTAK" value={kontak} onChange={(e) => setKontak(e.target.value)} fullWidth sx={tfSx} disabled={saving} />
            <TextField label="TOPIK" value={topik} onChange={(e) => setTopik(e.target.value)} fullWidth sx={tfSx} disabled={saving} />
            <TextField label="SUMBER DATA" value={sumberDataDetail} onChange={(e) => setSumberDataDetail(e.target.value)} fullWidth sx={tfSx} disabled={saving} />
            <TextField label="UKURAN" value={ukuran} onChange={(e) => setUkuran(e.target.value)} fullWidth sx={tfSx} disabled={saving} />
            <TextField label="SATUAN" value={satuan} onChange={(e) => setSatuan(e.target.value)} fullWidth sx={tfSx} disabled={saving} />
          </Stack>
        </Paper>

        {/* RIGHT PANEL */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: `${R_PANEL}px !important`,
            border: "1px solid rgba(46,125,50,0.22)",
            bgcolor: "rgba(46,125,50,0.06)",
            boxShadow: "0 8px 24px rgba(2,6,23,0.06)",
          }}
        >
          <Typography sx={{ fontWeight: 900, mb: 2 }}>KOMPONEN DATA</Typography>

          <Stack spacing={1.6}>
            {columns.map((c, idx) => (
              <Paper
                key={c.key}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: `${R_CARD}px !important`,
                  border: "1px solid rgba(15,23,42,0.10)",
                  bgcolor: "#fff",
                }}
              >
                <TextField
                  fullWidth
                  placeholder="HEADER / JUDUL KOLOM"
                  value={c.name}
                  onChange={(e) =>
                    handleUpdateColumn(c.key, {
                      name: formatHeader(e.target.value),
                    })
                  }
                  disabled={idx === 0 || saving}
                  sx={{ ...tfSx, mb: 1 }}
                />

                <TextField
                  fullWidth
                  placeholder="DESKRIPSI"
                  multiline
                  minRows={3}
                  value={c.desc}
                  onChange={(e) => handleUpdateColumn(c.key, { desc: e.target.value })}
                  disabled={saving}
                  sx={tfSx}
                />

                {idx !== 0 && (
                  <Button
                    color="error"
                    onClick={() => handleRemoveColumn(c.key)}
                    sx={{
                      mt: 1,
                      borderRadius: `${R_BTN}px !important`,
                      fontWeight: 800,
                      textTransform: "none",
                    }}
                    disabled={saving}
                  >
                    HAPUS
                  </Button>
                )}
              </Paper>
            ))}

            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={handleAddColumn}
              disabled={saving}
              sx={{
                borderRadius: `${R_BTN}px !important`,
                fontWeight: 800,
                bgcolor: "#2E7D32",
                "&:hover": { bgcolor: "#256628" },
                height: 44,
              }}
            >
              TAMBAH KOMPONEN
            </Button>

            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: `${R_CARD}px !important`,
                border: "1px solid rgba(15,23,42,0.10)",
                bgcolor: "#fff",
              }}
            >
              <Typography sx={{ fontWeight: 900, mb: 1 }}>
                PREVIEW PAYLOAD (DEMO)
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: `${R_INPUT}px !important`,
                  bgcolor: "rgba(2,6,23,0.04)",
                  overflow: "auto",
                  maxHeight: 280,
                  fontSize: 12,
                }}
              >
                {JSON.stringify(payloadPreview, null, 2)}
              </Box>
            </Paper>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}