// src/pages/datasets/DatasetUploadPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function getToken() {
  return localStorage.getItem("pd_access_token") || localStorage.getItem("accessToken") || "";
}
function normUpper(v) {
  return String(v ?? "").trim().toUpperCase();
}
function extractErrorMessage(json, fallback) {
  if (!json) return fallback;
  if (typeof json === "string") return json;
  return json?.message || json?.error?.message || json?.error || fallback;
}

async function fetchJson(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractErrorMessage(json, `HTTP ${res.status}`));
  return json;
}

async function downloadBlob({ url, token, filename }) {
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `Gagal download (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const href = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || "template";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(href);
}

// ✅ Endpoint sesuai backend kamu
const ENDPOINTS = {
  datasetDetail: (id) => `/datasets/${id}`,
  templateCsv: (id) => `/datasets/${id}/template.csv`,
  upload: (id) => `/uploads/${id}/file`, // POST /uploads/:dataset_id/file
};

// ✅ Parser response detail dataset yang fleksibel
function pickDatasetObject(json) {
  // dukung banyak bentuk payload
  const d = json?.data;
  if (d && typeof d === "object") {
    if (d.dataset && typeof d.dataset === "object") return d.dataset; // {data:{dataset:{...}}}
    return d; // {data:{...}}
  }
  if (json?.dataset && typeof json.dataset === "object") return json.dataset;
  if (json && typeof json === "object") return json;
  return null;
}

// ✅ Normalisasi field agar tidak ketipu snake/camel
function getJenisData(ds) {
  return ds?.jenis_data ?? ds?.jenisData ?? ds?.jenis ?? "";
}

export default function DatasetUploadPage() {
  const { datasetId } = useParams();
  const nav = useNavigate();

  const token = useMemo(() => getToken(), []);
  const [loading, setLoading] = useState(true);
  const [dataset, setDataset] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [toast, setToast] = useState({ open: false, severity: "info", message: "" });
  const showToast = (severity, message) =>
    setToast({ open: true, severity, message: String(message) });
  const closeToast = () => setToast((p) => ({ ...p, open: false }));

  const jenisData = useMemo(() => normUpper(getJenisData(dataset)), [dataset]);
  const namaDataset = useMemo(() => dataset?.nama_dataset ?? dataset?.namaDataset ?? "-", [dataset]);
  const isTerstruktur = jenisData === "TERSTRUKTUR";

  const acceptedHint = useMemo(() => {
    if (isTerstruktur) return "Format yang disarankan: .xlsx, .xls, .csv";
    return "Format diperbolehkan sesuai middleware backend (pdf/docx/csv/xlsx, dll).";
  }, [isTerstruktur]);

  const acceptAttr = useMemo(() => {
    if (isTerstruktur) return ".xlsx,.xls,.csv";
    return ".csv,.xlsx,.xls,.pdf,.doc,.docx";
  }, [isTerstruktur]);

  const loadDetail = async () => {
    try {
      if (!API_BASE) return showToast("error", "VITE_API_BASE_URL belum terbaca. Periksa .env lalu restart.");
      if (!token) return showToast("error", "Token tidak ditemukan. Silakan login ulang.");

      setLoading(true);
      const json = await fetchJson(`${API_BASE}${ENDPOINTS.datasetDetail(datasetId)}`, token);

      const dsObj = pickDatasetObject(json);
      setDataset(dsObj);

      // kalau masih kosong, kasih pesan jelas (biar cepat ketahuan masalahnya backend/response)
      if (!dsObj || !getJenisData(dsObj)) {
        console.warn("Dataset detail payload:", json);
        showToast(
          "warning",
          "Metadata dataset belum terbaca (jenis_data kosong). Cek response GET /datasets/:id di Network tab."
        );
      }
    } catch (e) {
      setDataset(null);
      showToast("error", e?.message || "Gagal memuat detail dataset.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  const handlePickFile = (e) => {
    const f = e.target.files?.[0];
    setSelectedFile(f || null);
  };

  const handleDownloadTemplateCsv = async () => {
    try {
      if (!isTerstruktur) return;
      await downloadBlob({
        url: `${API_BASE}${ENDPOINTS.templateCsv(datasetId)}`,
        token,
        filename: `template_${namaDataset}_${datasetId}.csv`,
      });
      showToast("success", "Template CSV berhasil diunduh.");
    } catch (e) {
      showToast("error", e?.message || "Gagal mengunduh template CSV.");
    }
  };

  const handleUpload = async () => {
    try {
      if (!API_BASE) return showToast("error", "VITE_API_BASE_URL belum terbaca.");
      if (!token) return showToast("error", "Token tidak ditemukan. Login ulang.");
      if (!selectedFile) return showToast("warning", "Pilih file terlebih dahulu.");

      if (isTerstruktur) {
        const name = (selectedFile.name || "").toLowerCase();
        const ok = name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
        if (!ok) return showToast("warning", "Untuk data terstruktur, gunakan .xlsx/.xls/.csv");
      }

      setUploading(true);

      const form = new FormData();
      form.append("file", selectedFile);

      const res = await fetch(`${API_BASE}${ENDPOINTS.upload(datasetId)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(extractErrorMessage(json, `Upload gagal (HTTP ${res.status})`));

      showToast("success", "Upload berhasil.");
      setSelectedFile(null);

      nav(`/datasets/${datasetId}/files`);
    } catch (e) {
      showToast("error", e?.message || "Upload gagal.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
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

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} spacing={1}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Upload Filedata
            </Typography>
            <Typography color="text.secondary">
              Dataset: <b>{namaDataset}</b> — ID: {datasetId}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshRoundedIcon />}
              onClick={loadDetail}
              disabled={loading}
              sx={{ borderRadius: 999, fontWeight: 900 }}
            >
              Refresh
            </Button>
            <Button variant="outlined" onClick={() => nav(-1)} sx={{ borderRadius: 999, fontWeight: 900 }}>
              Kembali
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Paper
          variant="outlined"
          sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(15,23,42,0.02)", borderColor: "rgba(15,23,42,0.10)" }}
        >
          {loading ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Memuat detail dataset...</Typography>
            </Stack>
          ) : !dataset ? (
            <Typography color="error.main">Detail dataset tidak tersedia.</Typography>
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Jenis: ${jenisData || "-"}`} />
              <Chip label={`Status: ${normUpper(dataset?.status) || "-"}`} />
              <Chip label={`Hak Akses: ${normUpper(dataset?.access_level) || "-"}`} />
              <Chip label={`Kategori: ${normUpper(dataset?.sdi_status || dataset?.dssd_status) || "-"}`} />
            </Stack>
          )}
        </Paper>

        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 0.8 }}>1) Unduh Template</Typography>
          {isTerstruktur ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                Dataset ini <b>Terstruktur</b> → template diperlukan agar kolom sesuai.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<CloudDownloadOutlinedIcon />}
                onClick={handleDownloadTemplateCsv}
                sx={{ borderRadius: 999, fontWeight: 900 }}
              >
                Download CSV
              </Button>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography color="text.secondary">
                Dataset ini <b>Tidak Terstruktur</b> (atau metadata belum terbaca). Template tidak diperlukan.
              </Typography>
            </Paper>
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 0.8 }}>2) Upload File</Typography>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
            <Typography color="text.secondary">{acceptedHint}</Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ mt: 1.5 }} alignItems="center">
              <Button
                component="label"
                variant="outlined"
                startIcon={<InsertDriveFileOutlinedIcon />}
                sx={{ borderRadius: 999, fontWeight: 900 }}
              >
                Pilih File
                <input hidden type="file" accept={acceptAttr} onChange={handlePickFile} />
              </Button>

              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {selectedFile ? selectedFile.name : "Belum ada file dipilih"}
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadOutlinedIcon />}
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                sx={{ borderRadius: 999, fontWeight: 900, bgcolor: "#0B3A53", "&:hover": { bgcolor: "#082C41" }, px: 2.2 }}
              >
                Upload
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Endpoint upload: <code>{ENDPOINTS.upload(datasetId)}</code>
            </Typography>
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
}