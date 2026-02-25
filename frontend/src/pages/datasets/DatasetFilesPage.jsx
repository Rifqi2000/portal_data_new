import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { DataGrid } from "@mui/x-data-grid";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function getToken() {
  return (
    localStorage.getItem("pd_access_token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
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
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractErrorMessage(json, `HTTP ${res.status}`));
  return json;
}

async function downloadBlob({ url, token, filename }) {
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Gagal download (HTTP ${res.status})`);
  }

  const blob = await res.blob();
  const href = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = href;
  a.download = filename || "file";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(href);
}

function formatSize(bytes) {
  const n = Number(bytes || 0);
  if (!n) return "-";
  const kb = n / 1024;
  const mb = kb / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  if (kb >= 1) return `${kb.toFixed(0)} KB`;
  return `${n} B`;
}

function formatDateID(dt) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString("id-ID");
  } catch {
    return String(dt);
  }
}

function formatDateKey(dt) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  } catch {
    return "";
  }
}

function safeString(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function buildDynamicColumnsFromKeys(keys) {
  const arr = (keys || [])
    .filter((k) => k && k !== "__id")
    .map(String); // ✅ JANGAN sort, biar ikut urutan API/file

  return arr.map((k) => ({
    field: k,
    headerName: k,
    minWidth: 160,
    flex: 1,
    // ✅ jangan pakai valueGetter, biarkan DataGrid ambil row[field]
    renderCell: (params) => (
      <span
        title={safeString(params.value)}
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "block",
          width: "100%",
        }}
      >
        {safeString(params.value)}
      </span>
    ),
  }));
}

const ENDPOINTS = {
  datasetDetail: (id) => `/datasets/${id}`,
  previewDataset: (id) => `/datasets/${id}/preview`, // tabel fisik ds_*
  listFiles: (datasetId) => `/uploads/${datasetId}/files`,
  downloadFile: (fileId) => `/uploads/file/${fileId}/download`,
  previewFile: (fileId) => `/uploads/file/${fileId}/preview`, // sinkron isi file
};

// ---- normalizer untuk response files ----
function normalizeFileRow(f) {
  if (!f || typeof f !== "object") return f;

  return {
    ...f,
    uploaded_at: f.uploaded_at ?? f.created_at ?? f.upload_time ?? null,
    file_size: f.file_size ?? f.size ?? f.filesize ?? null,
    file_type: f.file_type ?? f.mime_type ?? f.type ?? null,
  };
}

export default function DatasetFilesPage() {
  const { datasetId } = useParams();
  const nav = useNavigate();
  const token = useMemo(() => getToken(), []);

  // dataset meta
  const [dsLoading, setDsLoading] = useState(true);
  const [datasetRaw, setDatasetRaw] = useState(null);

  // data terbaru (preview tabel fisik ds_*)
  const [latestLoading, setLatestLoading] = useState(true);
  const [latestRows, setLatestRows] = useState([]);
  const [latestCols, setLatestCols] = useState([]);
  const [latestTotal, setLatestTotal] = useState(0);
  const [latestPage, setLatestPage] = useState(0);
  const [latestPageSize, setLatestPageSize] = useState(10);

  // files list
  const [filesLoading, setFilesLoading] = useState(true);
  const [files, setFiles] = useState([]);

  // filter tanggal upload untuk riwayat
  const [uploadDateFilter, setUploadDateFilter] = useState("ALL");

  // dialog preview per file
  const [openPreview, setOpenPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // preview rows di dialog (preview isi file)
  const [dlgLoading, setDlgLoading] = useState(false);
  const [dlgRows, setDlgRows] = useState([]);
  const [dlgCols, setDlgCols] = useState([]);
  const [dlgTotal, setDlgTotal] = useState(0);
  const [dlgPage, setDlgPage] = useState(0);
  const [dlgPageSize, setDlgPageSize] = useState(10);

  // toast
  const [toast, setToast] = useState({
    open: false,
    severity: "info",
    message: "",
  });
  const showToast = (severity, message) =>
    setToast({ open: true, severity, message: String(message) });
  const closeToast = () => setToast((p) => ({ ...p, open: false }));

  // ========= NORMALIZE DATASET =========
  const ds = useMemo(() => {
    const d = datasetRaw?.data ?? datasetRaw;
    return d?.dataset ?? d ?? null;
  }, [datasetRaw]);

  const jenisData = useMemo(() => normUpper(ds?.jenis_data), [ds]);
  const isTerstruktur = jenisData === "TERSTRUKTUR";

  const kategori = useMemo(() => {
    if (!ds) return "-";
    if (normUpper(ds?.jenis_data) === "TERSTRUKTUR")
      return normUpper(ds?.sdi_status) || "-";
    if (normUpper(ds?.jenis_data) === "TIDAK_TERSTRUKTUR")
      return normUpper(ds?.dssd_status) || "-";
    return "-";
  }, [ds]);

  // ========= LOADERS =========
  const loadDataset = async () => {
    if (!API_BASE)
      return showToast(
        "error",
        "VITE_API_BASE_URL belum terbaca. Periksa .env lalu restart."
      );
    if (!token)
      return showToast("error", "Token tidak ditemukan. Silakan login ulang.");

    setDsLoading(true);
    try {
      const json = await fetchJson(
        `${API_BASE}${ENDPOINTS.datasetDetail(datasetId)}`,
        token
      );
      setDatasetRaw(json);
    } catch (e) {
      setDatasetRaw(null);
      showToast("error", e?.message || "Gagal memuat detail dataset.");
    } finally {
      setDsLoading(false);
    }
  };

  const loadFiles = async () => {
    if (!API_BASE) return;
    if (!token) return;

    setFilesLoading(true);
    try {
      const json = await fetchJson(
        `${API_BASE}${ENDPOINTS.listFiles(datasetId)}`,
        token
      );
      const data = json?.data ?? {};
      const items = Array.isArray(data?.items) ? data.items : [];
      setFiles(items.map(normalizeFileRow));
    } catch (e) {
      setFiles([]);
      showToast("error", e?.message || "Gagal memuat list file.");
    } finally {
      setFilesLoading(false);
    }
  };

  const buildPreviewUrl = (page, pageSize) => {
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(page * pageSize));
    return `${API_BASE}${ENDPOINTS.previewDataset(datasetId)}?${params.toString()}`;
  };

  // ✅ Preview tabel fisik ds_*
  const loadLatestPreview = async () => {
    if (!API_BASE) return;
    if (!token) return;

    if (!isTerstruktur) {
      setLatestRows([]);
      setLatestCols([]);
      setLatestTotal(0);
      setLatestLoading(false);
      return;
    }

    setLatestLoading(true);
    try {
      const url = buildPreviewUrl(latestPage, latestPageSize);
      const json = await fetchJson(url, token);
      const data = json?.data ?? json;

      const cols = Array.isArray(data?.columns) ? data.columns : [];
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const total =
        Number(data?.pagination?.total ?? data?.total ?? rows.length ?? 0) || 0;

      const shaped = rows.map((r, idx) => ({
        __id: latestPage * latestPageSize + idx + 1,
        ...(r || {}),
      }));

      setLatestCols(cols);
      setLatestRows(shaped);
      setLatestTotal(total);
    } catch (e) {
      setLatestRows([]);
      setLatestCols([]);
      setLatestTotal(0);
      showToast("error", e?.message || "Gagal memuat data terbaru (preview).");
    } finally {
      setLatestLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadDataset(), loadFiles()]);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  useEffect(() => {
    if (!ds) return;
    loadLatestPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds?.dataset_id, isTerstruktur, latestPage, latestPageSize]);

  // ========= FILTER DATES FOR FILES =========
  const uploadDateOptions = useMemo(() => {
    const set = new Set();
    files.forEach((f) => {
      const k = formatDateKey(f.uploaded_at);
      if (k) set.add(k);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [files]);

  const filteredFiles = useMemo(() => {
    if (uploadDateFilter === "ALL") return files;
    return files.filter((f) => formatDateKey(f.uploaded_at) === uploadDateFilter);
  }, [files, uploadDateFilter]);

  // ========= DATAGRID COLUMNS =========
  const latestColumns = useMemo(() => {
    if (!latestRows.length) {
      return [
        { field: "__id", headerName: "No", width: 90 },
        { field: "__empty", headerName: "Data", flex: 1, valueGetter: () => "-" },
      ];
    }

    const keys =
      latestCols?.length ? latestCols : Object.keys(latestRows[0] || {});
    const dyn = buildDynamicColumnsFromKeys(keys);
    return [{ field: "__id", headerName: "No", width: 90 }, ...dyn];
  }, [latestRows, latestCols]);

  const fileColumns = useMemo(
    () => [
      {
        field: "file_name",
        headerName: "Nama File",
        flex: 1.6,
        minWidth: 260,
        renderCell: (params) => (
          <span
            title={params.row?.file_name || ""}
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
              width: "100%",
            }}
          >
            {params.row?.file_name || "-"}
          </span>
        ),
      },
      {
        field: "version",
        headerName: "Versi",
        width: 110,
        renderCell: (params) => (
          <Chip
            size="small"
            label={`V${params.row?.version ?? "-"}`}
            variant="outlined"
          />
        ),
      },
      {
        field: "uploaded_at",
        headerName: "Tanggal Upload",
        width: 200,
        renderCell: (params) => formatDateID(params.row?.uploaded_at),
      },
      {
        field: "file_size",
        headerName: "Ukuran",
        width: 120,
        renderCell: (params) => formatSize(params.row?.file_size),
      },
      {
        field: "file_type",
        headerName: "Tipe",
        width: 140,
        renderCell: (params) => params.row?.file_type || "-",
      },
      {
        field: "is_active",
        headerName: "Status",
        width: 120,
        renderCell: (params) =>
          params.row?.is_active ? (
            <Chip size="small" label="Aktif" color="success" />
          ) : (
            <Chip size="small" label="Nonaktif" variant="outlined" />
          ),
      },
      {
        field: "aksi",
        headerName: "Aksi",
        width: 140,
        sortable: false,
        filterable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityOutlinedIcon />}
            sx={{ borderRadius: 999, fontWeight: 900 }}
            onClick={() => {
              // ✅ BUGFIX: harus params.row (bukan p.row)
              setSelectedFile(params.row);
              setDlgPage(0);
              setDlgPageSize(10);
              setOpenPreview(true);
            }}
          >
            Preview
          </Button>
        ),
      },
    ],
    []
  );

  // ========= ACTIONS =========
  const handleDownloadFile = async (f) => {
    try {
      const fileId = f?.file_id;
      if (!fileId) return showToast("error", "file_id tidak ditemukan.");

      await downloadBlob({
        url: `${API_BASE}${ENDPOINTS.downloadFile(fileId)}`,
        token,
        filename: f?.file_name || `dataset_${datasetId}_v${f?.version || ""}`,
      });

      showToast("success", "Download dimulai.");
    } catch (e) {
      showToast("error", e?.message || "Gagal download.");
    }
  };

  // ✅ Preview isi file (sinkron dengan unduhan)
  const loadDialogPreview = async () => {
    if (!openPreview) return;

    if (!isTerstruktur) {
      setDlgRows([]);
      setDlgCols([]);
      setDlgTotal(0);
      return;
    }

    const fileId = selectedFile?.file_id;
    if (!fileId) {
      setDlgRows([]);
      setDlgCols([]);
      setDlgTotal(0);
      return;
    }

    setDlgLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(dlgPageSize));
      params.set("offset", String(dlgPage * dlgPageSize));

      const url = `${API_BASE}${ENDPOINTS.previewFile(fileId)}?${params.toString()}`;

      const json = await fetchJson(url, token);
      const data = json?.data ?? json;

      const cols = Array.isArray(data?.columns) ? data.columns : [];
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      const total =
        Number(data?.pagination?.total ?? data?.total ?? rows.length ?? 0) || 0;

      const shaped = rows.map((r, idx) => ({
        __id: dlgPage * dlgPageSize + idx + 1,
        ...(r || {}),
      }));

      setDlgCols(cols);
      setDlgRows(shaped);
      setDlgTotal(total);
    } catch (e) {
      setDlgRows([]);
      setDlgCols([]);
      setDlgTotal(0);
      showToast("error", e?.message || "Gagal memuat preview file.");
    } finally {
      setDlgLoading(false);
    }
  };

  useEffect(() => {
    if (!openPreview) return;
    loadDialogPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPreview, selectedFile?.file_id, dlgPage, dlgPageSize, isTerstruktur]);

  const dlgColumns = useMemo(() => {
    if (!dlgRows.length) {
      return [
        { field: "__id", headerName: "No", width: 90 },
        { field: "__empty", headerName: "Data", flex: 1, valueGetter: () => "-" },
      ];
    }
    const keys = dlgCols?.length ? dlgCols : Object.keys(dlgRows[0] || {});
    const dyn = buildDynamicColumnsFromKeys(keys);
    return [{ field: "__id", headerName: "No", width: 90 }, ...dyn];
  }, [dlgRows, dlgCols]);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
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

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        {/* Header */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ md: "center" }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Lihat Filedata
            </Typography>
            <Typography color="text.secondary">Dataset ID: {datasetId}</Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => nav(-1)}
              sx={{ borderRadius: 999, fontWeight: 900 }}
            >
              Kembali
            </Button>

            <Button
              variant="outlined"
              startIcon={
                dsLoading || filesLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshRoundedIcon />
                )
              }
              onClick={refreshAll}
              disabled={dsLoading || filesLoading}
              sx={{ borderRadius: 999, fontWeight: 900 }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Chips dataset */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: "rgba(15,23,42,0.02)",
            borderColor: "rgba(15,23,42,0.10)",
          }}
        >
          {dsLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography color="text.secondary">
                Memuat identitas data...
              </Typography>
            </Stack>
          ) : !ds ? (
            <Typography color="error.main">Identitas data tidak tersedia.</Typography>
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Jenis: ${normUpper(ds?.jenis_data) || "-"}`} />
              <Chip label={`Status: ${normUpper(ds?.status) || "-"}`} />
              <Chip label={`Hak Akses: ${normUpper(ds?.access_level) || "-"}`} />
              <Chip label={`Kategori: ${kategori || "-"}`} />
            </Stack>
          )}
        </Paper>

        {/* DATA TERBARU */}
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 0.8 }}>Data Terbaru</Typography>

          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
            {!dsLoading && !isTerstruktur ? (
              <Box sx={{ p: 2 }}>
                <Typography color="text.secondary" align="center">
                  Dataset tidak terstruktur: tidak ada preview tabel.
                </Typography>
              </Box>
            ) : (
              <DataGrid
                autoHeight
                rows={latestRows}
                columns={latestColumns}
                getRowId={(r) => r.__id}
                loading={latestLoading}
                rowCount={latestTotal}
                paginationMode="server"
                paginationModel={{ page: latestPage, pageSize: latestPageSize }}
                onPaginationModelChange={(m) => {
                  setLatestPage(m.page);
                  setLatestPageSize(m.pageSize);
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                disableRowSelectionOnClick
                sx={{
                  border: "none",
                  "& .MuiDataGrid-columnHeaders": {
                    bgcolor: "rgba(15,23,42,0.02)",
                    borderBottom: "1px solid rgba(15,23,42,0.08)",
                    fontWeight: 900,
                  },
                  "& .MuiDataGrid-row": {
                    borderBottom: "1px solid rgba(15,23,42,0.06)",
                  },
                }}
                localeText={{ noRowsLabel: "Tidak ada data" }}
              />
            )}
          </Paper>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Sumber Data Terbaru: <code>/datasets/:dataset_id/preview</code> (tabel fisik{" "}
            <code>ds_*</code>)
          </Typography>
        </Box>

        {/* RIWAYAT UPLOAD */}
        <Box sx={{ mt: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography sx={{ fontWeight: 900 }}>Riwayat Upload</Typography>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <Typography
                variant="caption"
                sx={{ mb: 0.5, color: "text.secondary" }}
              >
                Filter Tanggal Upload
              </Typography>
              <Select
                value={uploadDateFilter}
                onChange={(e) => setUploadDateFilter(e.target.value)}
              >
                <MenuItem value="ALL">Semua Tanggal</MenuItem>
                {uploadDateOptions.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
            <DataGrid
              autoHeight
              rows={filteredFiles}
              columns={fileColumns}
              getRowId={(r) => r.file_id}
              loading={filesLoading}
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 10 } },
              }}
              disableRowSelectionOnClick
              sx={{
                border: "none",
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "rgba(15,23,42,0.02)",
                  borderBottom: "1px solid rgba(15,23,42,0.08)",
                  fontWeight: 900,
                },
                "& .MuiDataGrid-row": {
                  borderBottom: "1px solid rgba(15,23,42,0.06)",
                },
              }}
              localeText={{ noRowsLabel: "Belum ada file yang diupload" }}
            />
          </Paper>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1.2 }}
          >
            Endpoint list: <code>{ENDPOINTS.listFiles(datasetId)}</code> • download:{" "}
            <code>{ENDPOINTS.downloadFile("{file_id}")}</code>
          </Typography>
        </Box>
      </Paper>

      {/* DIALOG PREVIEW */}
      <Dialog
        open={openPreview}
        onClose={() => setOpenPreview(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Preview File Upload
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            {selectedFile?.file_name || "-"} • Versi {selectedFile?.version ?? "-"} •{" "}
            {formatDateID(selectedFile?.uploaded_at)}
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              bgcolor: "rgba(15,23,42,0.02)",
              borderColor: "rgba(15,23,42,0.10)",
              mb: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Ukuran: <b>{formatSize(selectedFile?.file_size)}</b> • Tipe:{" "}
              <b>{selectedFile?.file_type || "-"}</b> • Status File:{" "}
              <b>{selectedFile?.is_active ? "Aktif" : "Nonaktif"}</b> • Dataset:{" "}
              <b>{ds?.nama_dataset || "-"}</b>
            </Typography>
          </Paper>

          {!isTerstruktur ? (
            <Typography color="text.secondary">
              Dataset ini <b>Tidak Terstruktur</b>. Preview tabel tidak tersedia (hanya file).
              Silakan unduh file jika diperlukan.
            </Typography>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden" }}>
              <DataGrid
                autoHeight
                rows={dlgRows}
                columns={dlgColumns}
                getRowId={(r) => r.__id}
                loading={dlgLoading}
                rowCount={dlgTotal}
                paginationMode="server"
                paginationModel={{ page: dlgPage, pageSize: dlgPageSize }}
                onPaginationModelChange={(m) => {
                  setDlgPage(m.page);
                  setDlgPageSize(m.pageSize);
                }}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
                sx={{
                  border: "none",
                  "& .MuiDataGrid-columnHeaders": {
                    bgcolor: "rgba(15,23,42,0.02)",
                    borderBottom: "1px solid rgba(15,23,42,0.08)",
                    fontWeight: 900,
                  },
                  "& .MuiDataGrid-row": {
                    borderBottom: "1px solid rgba(15,23,42,0.06)",
                  },
                }}
                localeText={{ noRowsLabel: "Tidak ada data preview" }}
              />
            </Paper>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setOpenPreview(false)}
            sx={{ borderRadius: 999, fontWeight: 900 }}
          >
            Tutup
          </Button>

          <Button
            variant="contained"
            startIcon={<CloudDownloadOutlinedIcon />}
            onClick={() => handleDownloadFile(selectedFile)}
            sx={{
              borderRadius: 999,
              fontWeight: 900,
              bgcolor: "#0B3A53",
              "&:hover": { bgcolor: "#082C41" },
            }}
          >
            Unduh
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}