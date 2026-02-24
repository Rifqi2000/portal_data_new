import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";

import { DataGrid } from "@mui/x-data-grid";
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

async function downloadWithAuth({ url, token, filename }) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Gagal download (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const href = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(href);
}

function safeString(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function buildDynamicColumns(rows) {
  const keys = new Set();
  rows.slice(0, 50).forEach((r) => {
    if (r && typeof r === "object") Object.keys(r).forEach((k) => keys.add(k));
  });

  const arr = Array.from(keys);
  arr.sort((a, b) => a.localeCompare(b));

  return arr.map((k) => ({
    field: k,
    headerName: k,
    minWidth: 160,
    flex: 1,
    valueGetter: (params) => params?.row?.[k],
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

export default function DatasetPreviewPage() {
  const { datasetId } = useParams();
  const nav = useNavigate();

  const token = useMemo(() => getToken(), []);

  // dataset meta
  const [dsLoading, setDsLoading] = useState(true);
  const [dataset, setDataset] = useState(null);

  // preview
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // pagination
  const [page, setPage] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState(25);

  // toast
  const [toast, setToast] = useState({ open: false, severity: "info", message: "" });
  const showToast = (severity, message) =>
    setToast({ open: true, severity, message: String(message) });
  const closeToast = () => setToast((p) => ({ ...p, open: false }));

  const jenisData = useMemo(() => normUpper(dataset?.jenis_data), [dataset]);
  const isTerstruktur = jenisData === "TERSTRUKTUR";

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("offset", String(page * pageSize));
    return `${API_BASE}/datasets/${datasetId}/preview?${params.toString()}`;
  }, [datasetId, page, pageSize]);

  const templateUrl = useMemo(
    () => `${API_BASE}/datasets/${datasetId}/template.csv`,
    [datasetId]
  );

  const loadDataset = async () => {
    if (!API_BASE) return showToast("error", "VITE_API_BASE_URL belum terbaca. Periksa .env lalu restart.");
    if (!token) return showToast("error", "Token tidak ditemukan. Silakan login ulang.");

    setDsLoading(true);
    try {
      const json = await fetchJson(`${API_BASE}/datasets/${datasetId}`, token);
      setDataset(json?.data || null);
    } catch (e) {
      setDataset(null);
      showToast("error", e?.message || "Gagal memuat metadata dataset.");
    } finally {
      setDsLoading(false);
    }
  };

  const loadPreview = async () => {
    if (!API_BASE) return;
    if (!token) return;

    setLoading(true);
    try {
      const json = await fetchJson(previewUrl, token);

      const data = json?.data ?? {};
      const items =
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data?.rows) ? data.rows :
        Array.isArray(data) ? data : [];

      const t =
        Number(data?.pagination?.total ?? data?.total ?? 0) ||
        0;

      const shaped = items.map((r, idx) => ({
        __id: page * pageSize + idx + 1,
        ...(r?.record_data && typeof r.record_data === "object" ? r.record_data : r),
      }));

      setRows(shaped);
      setTotal(t || shaped.length);
    } catch (e) {
      setRows([]);
      setTotal(0);
      showToast("error", e?.message || "Gagal memuat preview data.");
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadDataset(), loadPreview()]);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  const columns = useMemo(() => {
    if (!rows.length) {
      return [
        { field: "__id", headerName: "No", width: 90 },
        { field: "__empty", headerName: "Data", flex: 1, valueGetter: () => "-" },
      ];
    }
    const dyn = buildDynamicColumns(rows);
    return [{ field: "__id", headerName: "No", width: 90 }, ...dyn];
  }, [rows]);

  const handleDownloadTemplate = async () => {
    try {
      if (!isTerstruktur) return;
      await downloadWithAuth({
        url: templateUrl,
        token,
        filename: `template_${datasetId}.csv`,
      });
      showToast("success", "Template terunduh.");
    } catch (e) {
      showToast("error", e?.message || "Gagal download template.");
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
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
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Preview Data
            </Typography>
            <Typography color="text.secondary">Dataset ID: {datasetId}</Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {dsLoading
                ? "Memuat metadata..."
                : `Nama: ${dataset?.nama_dataset || "-"} • Jenis: ${jenisData || "-"}`}
            </Typography>
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
              startIcon={(loading || dsLoading) ? <CircularProgress size={16} /> : <RefreshRoundedIcon />}
              onClick={refreshAll}
              disabled={loading || dsLoading}
              sx={{ borderRadius: 999, fontWeight: 900 }}
            >
              Refresh
            </Button>

            <Button
              variant="outlined"
              startIcon={<VisibilityOutlinedIcon />}
              onClick={() => nav(`/datasets/${datasetId}/files`)}
              sx={{ borderRadius: 999, fontWeight: 900 }}
            >
              Ke Filedata
            </Button>

            {isTerstruktur && (
              <Button
                variant="contained"
                startIcon={<CloudDownloadOutlinedIcon />}
                onClick={handleDownloadTemplate}
                sx={{
                  borderRadius: 999,
                  fontWeight: 900,
                  bgcolor: "#0B3A53",
                  "&:hover": { bgcolor: "#082C41" },
                }}
              >
                Template
              </Button>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {!dsLoading && !isTerstruktur && (
          <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: 2.5, mb: 2, bgcolor: "rgba(15,23,42,0.02)" }}
          >
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Info</Typography>
            <Typography color="text.secondary">
              Dataset ini <b>Tidak Terstruktur</b>. Preview tabular tidak tersedia karena backend tidak menyimpan
              <code> dataset_records </code> untuk jenis ini.
            </Typography>
          </Paper>
        )}

        <Paper sx={{ borderRadius: 3, overflow: "hidden" }} variant="outlined">
          <DataGrid
            autoHeight
            rows={rows}
            columns={columns}
            getRowId={(r) => r.__id}
            loading={loading}
            rowCount={total}
            paginationMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(m) => {
              // kalau pageSize berubah, reset ke page 0 supaya offset tidak aneh
              if (m.pageSize !== pageSize) setPage(0);
              else setPage(m.page);
              setPageSize(m.pageSize);
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
            localeText={{ noRowsLabel: "Tidak ada data preview" }}
          />
        </Paper>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.2 }}>
          Endpoint: <code>/datasets/:dataset_id/preview?limit=&offset=</code>
        </Typography>
      </Paper>
    </Box>
  );
}