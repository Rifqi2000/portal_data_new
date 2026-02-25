// src/pages/DatasetsPage.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
  Tooltip,
  ListItemIcon,
  ListItemText,
} from "@mui/material";

import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";

import { DataGrid } from "@mui/x-data-grid";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const NAVY = "#0B3A53";

// ======= ENV / TOKEN =======
const API_BASE = import.meta.env.VITE_API_BASE_URL; // contoh: http://localhost:5000/api
function getToken() {
  return localStorage.getItem("pd_access_token") || localStorage.getItem("accessToken") || "";
}

// ======= OPTIONS (UI) =======
const OPT_HAK_AKSES = ["Semua", "TERBUKA", "TERBATAS", "RAHASIA"];
const OPT_JENIS = ["Semua", "TERSTRUKTUR", "TIDAK_TERSTRUKTUR"];
const OPT_KATEGORI = ["Semua", "SDI", "NON_SDI", "DSSD", "NON_DSSD"];
const OPT_STATUS = [
  "Semua",
  "DRAFT",
  "SUBMITTED",
  "APPROVED_BY_KABID",
  "REJECTED_BY_KABID",
  "VERIFIED_BY_PUSDATIN",
  "REJECTED_BY_PUSDATIN",
];
const OPT_PERIODE = [
  "Semua",
  "1 MINGGU SEKALI",
  "1 BULAN SEKALI",
  "3 BULAN SEKALI",
  "6 BULAN SEKALI",
  "1 TAHUN SEKALI",
  "LIMA TAHUN SEKALI",
];

// ======= helpers =======
function normUpper(v) {
  return String(v ?? "").trim().toUpperCase();
}

function toDisplayStatus(s) {
  const x = normUpper(s);
  const map = {
    DRAFT: "Draft",
    SUBMITTED: "Data Diajukan",
    APPROVED_BY_KABID: "Diterima Kepala Bidang",
    REJECTED_BY_KABID: "Ditolak Kepala Bidang",
    VERIFIED_BY_PUSDATIN: "Selesai",
    REJECTED_BY_PUSDATIN: "Ditolak Pusdatin",
  };
  return map[x] || (x || "-");
}

function toDisplayJenis(s) {
  const x = normUpper(s);
  return x === "TERSTRUKTUR"
    ? "Data Terstruktur"
    : x === "TIDAK_TERSTRUKTUR"
    ? "Data Tidak Terstruktur"
    : x || "-";
}

function toDisplayHakAkses(s) {
  const x = normUpper(s);
  const map = {
    TERBUKA: "Terbuka",
    TERBATAS: "Terbatas",
    RAHASIA: "Rahasia",
    TERTUTUP: "Tertutup",
  };
  return map[x] || (x || "-");
}

function toDisplayKategori(ds) {
  const jenis = normUpper(ds?.jenis_data);
  if (jenis === "TERSTRUKTUR") return normUpper(ds?.sdi_status) || "-";
  if (jenis === "TIDAK_TERSTRUKTUR") return normUpper(ds?.dssd_status) || "-";
  return "-";
}

function extractErrorMessage(json, fallback) {
  if (!json) return fallback;
  if (typeof json === "string") return json;
  return json?.message || json?.error?.message || json?.error || fallback;
}

// =======================================================
// ROUTE TARGETS
// =======================================================
const ROUTES = {
  filesList: (id) => `/datasets/${id}/files`,
  upload: (id) => `/datasets/${id}/upload`,
  metadataView: (id) => `/datasets/${id}`,
  metadataEdit: (id) => `/datasets/${id}/edit`,
  logs: (id) => `/datasets/${id}/logs`,
  viz: (id) => `/datasets/${id}/visualize`,
  approveKabid: (id) => `/datasets/${id}/approve-kabid`,
  approvePusdatin: (id) => `/datasets/${id}/approve-pusdatin`,
};

// =======================================================
// ACTION MENU (titik tiga)
// =======================================================
function ActionMenu({ row, roleCtx, onNavigate, onRequestDelete }) {
  const { isBidang, isKepalaBidang, isPusdatin } = roleCtx;

  const status = normUpper(row?.status);
  const id = row?.dataset_id;

  // gating status (sesuaikan SOP)
  const canUpload = isBidang && ["DRAFT", "REJECTED_BY_KABID", "REJECTED_BY_PUSDATIN"].includes(status);
  const canEditMeta = isBidang && ["DRAFT", "REJECTED_BY_KABID", "REJECTED_BY_PUSDATIN"].includes(status);

  const canApproveKabid = isKepalaBidang && status === "SUBMITTED";
  const canApprovePusdatin = isPusdatin && status === "APPROVED_BY_KABID";

  // sesuai requirement: hapus hanya KEPALA_BIDANG
  const canDelete = isKepalaBidang;

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const go = (path) => {
    closeMenu();
    onNavigate(path);
  };

  return (
    <>
      <Tooltip title="Aksi">
        <IconButton
          size="small"
          onClick={openMenu}
          sx={{ p: 0.6, borderRadius: 2 }}
          aria-label="Aksi"
        >
          <MoreHorizOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        // penting agar menu tidak “ketarik” oleh DataGrid container
        disablePortal={false}
      >
        {/* 1. Lihat Filedata */}
        <MenuItem onClick={() => go(ROUTES.filesList(id))} dense>
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Lihat Filedata" secondary="Lihat data per tanggal upload" />
        </MenuItem>

        {/* 2. Upload Filedata (hanya BIDANG) */}
        {isBidang && (
          <MenuItem onClick={() => go(ROUTES.upload(id))} dense disabled={!canUpload}>
            <ListItemIcon>
              <CloudUploadOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Upload Filedata"
              secondary={canUpload ? "Upload data & unduh template" : "Hanya saat Draft / Ditolak"}
            />
          </MenuItem>
        )}

        <Divider />

        {/* 3. Lihat MetaData */}
        <MenuItem onClick={() => go(ROUTES.metadataView(id))} dense>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Lihat Metadata" secondary="Identitas Data & Komponen Data" />
        </MenuItem>

        {/* 4. Edit MetaData (hanya BIDANG) */}
        {isBidang && (
          <MenuItem onClick={() => go(ROUTES.metadataEdit(id))} dense disabled={!canEditMeta}>
            <ListItemIcon>
              <EditOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Edit Metadata"
              secondary={canEditMeta ? "Edit identitas & komponen" : "Hanya saat Draft / Ditolak"}
            />
          </MenuItem>
        )}

        <Divider />

        {/* 5. Pelacakan Data */}
        <MenuItem onClick={() => go(ROUTES.logs(id))} dense>
          <ListItemIcon>
            <TimelineOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Pelacakan Data" secondary="Lihat log/kegiatan data" />
        </MenuItem>

        {/* 6. Visualisasi Data */}
        <MenuItem onClick={() => go(ROUTES.viz(id))} dense>
          <ListItemIcon>
            <InsertChartOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Visualisasi Data" secondary="Buat visualisasi dari kolom data" />
        </MenuItem>

        {/* 8. Approve Kepala Bidang */}
        {isKepalaBidang && (
          <MenuItem onClick={() => go(ROUTES.approveKabid(id))} dense disabled={!canApproveKabid}>
            <ListItemIcon>
              <CheckCircleOutlineOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Approve Kepala Bidang"
              secondary={canApproveKabid ? "Review metadata & data" : "Hanya saat Data Diajukan"}
            />
          </MenuItem>
        )}

        {/* 9. Approve Pusdatin */}
        {isPusdatin && (
          <MenuItem onClick={() => go(ROUTES.approvePusdatin(id))} dense disabled={!canApprovePusdatin}>
            <ListItemIcon>
              <CheckCircleOutlineOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Approve Pusdatin"
              secondary={canApprovePusdatin ? "Final approval" : "Hanya saat Disetujui Kabid"}
            />
          </MenuItem>
        )}

        <Divider />

        {/* 7. Hapus Data (hanya KEPALA_BIDANG) */}
        {isKepalaBidang && (
          <MenuItem
            dense
            onClick={() => {
              closeMenu();
              onRequestDelete(row);
            }}
            disabled={!canDelete}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon sx={{ color: "error.main" }}>
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Hapus Data" secondary="Hapus satu dataset" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

export default function DatasetsPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, loading: authLoading } = useAuth() || {};

  // ===== ROLE detection =====
  const roleUpper = useMemo(() => normUpper(user?.role || user?.role_name), [user]);

  const rolesArrUpper = useMemo(() => {
    const arr = Array.isArray(user?.roles) ? user.roles : [];
    return arr.map((r) => normUpper(r));
  }, [user]);

  const hasRole = useCallback(
    (role) => {
      const r = normUpper(role);
      if (roleUpper === r) return true;
      return rolesArrUpper.includes(r);
    },
    [roleUpper, rolesArrUpper]
  );

  const isBidang = useMemo(() => hasRole("BIDANG"), [hasRole]);
  const isKepalaBidang = useMemo(() => hasRole("KEPALA_BIDANG"), [hasRole]);
  const isPusdatin = useMemo(() => hasRole("PUSDATIN") || hasRole("KEPALA_PUSDATIN"), [hasRole]);

  // ✅ BIDANG + KEPALA_BIDANG => sama (hanya bidang sendiri)
  const isBidangLike = useMemo(() => isBidang || isKepalaBidang, [isBidang, isKepalaBidang]);

  // ✅ yang boleh lihat semua
  const canSeeAll = useMemo(() => isPusdatin, [isPusdatin]);

  const bidangId = useMemo(() => {
    const v = user?.bidang_id ?? user?.bidangId ?? user?.bidang?.id;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }, [user]);

  // ===== filter UI state =====
  const [openFilter, setOpenFilter] = useState(true);
  const [q, setQ] = useState("");
  const [hakAkses, setHakAkses] = useState("Semua");
  const [jenisData, setJenisData] = useState("Semua");
  const [kategori, setKategori] = useState("Semua");
  const [statusData, setStatusData] = useState("Semua");
  const [periodeData, setPeriodeData] = useState("Semua");
  const [produsen, setProdusen] = useState("");

  // ===== data state =====
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(false);

  // ===== DataGrid pagination (server) =====
  const [page, setPage] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState(10);

  // ===== toast =====
  const [toast, setToast] = useState({ open: false, severity: "info", message: "" });
  const showToast = (severity, message) => setToast({ open: true, severity, message: String(message) });
  const closeToast = () => setToast((p) => ({ ...p, open: false }));

  // ===== delete confirm (placeholder) =====
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ===== API query (backend dukung: status & q & page & limit) =====
  const apiQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page + 1)); // backend 1-based
    params.set("limit", String(pageSize));

    const qq = String(q || "").trim();
    if (qq) params.set("q", qq);

    const st = normUpper(statusData);
    if (st && st !== "SEMUA") params.set("status", st);

    return params.toString();
  }, [q, statusData, page, pageSize]);

  const fetchDatasets = async ({ silent = false } = {}) => {
    try {
      if (!API_BASE) {
        showToast("error", "VITE_API_BASE_URL belum terbaca. Periksa .env lalu restart.");
        return;
      }

      const token = getToken();
      if (!token) {
        showToast("error", "Token tidak ditemukan. Silakan login ulang.");
        return;
      }

      if (!silent) setFetching(true);

      const res = await fetch(`${API_BASE}/datasets?${apiQueryParams}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(extractErrorMessage(json, `Gagal ambil dataset (HTTP ${res.status}).`));
      }

      const list = Array.isArray(json?.data?.items) ? json.data.items : [];
      const t = Number(json?.data?.pagination?.total ?? 0) || 0;

      setItems(list);
      setTotal(t);
    } catch (err) {
      console.error(err);
      showToast("error", err?.message || "Gagal memuat dataset.");
      setItems([]);
      setTotal(0);
    } finally {
      setFetching(false);
    }
  };

  // fetch on mount / when query changes (debounce q)
  useEffect(() => {
    if (authLoading) return;
    const t = setTimeout(() => fetchDatasets(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, apiQueryParams]);

  // auto refresh when coming from CreateDatasetPage
  useEffect(() => {
    if (loc?.state?.refresh) {
      fetchDatasets({ silent: true });
      nav(loc.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc?.state?.refresh]);

  // rows + FE RBAC safety layer + client-side filters
  const filteredRows = useMemo(() => {
    let rows = items.map((d) => {
      const row = {
        dataset_id: d.dataset_id,
        bidang_id: d.bidang_id,
        created_at: d.created_at,
        updated_at: d.updated_at,
        nama_dataset: d.nama_dataset,
        produsen_data: d.produsen_data,
        access_level: d.access_level,
        jenis_data: d.jenis_data,
        sdi_status: d.sdi_status,
        dssd_status: d.dssd_status,
        status: d.status,
        periode_pemutakhiran: d.periode_pemutakhiran,
      };

      return {
        ...row,
        created_at_disp: row.created_at ? new Date(row.created_at).toLocaleString("id-ID") : "-",
        updated_at_disp: row.updated_at ? new Date(row.updated_at).toLocaleString("id-ID") : "-",
        periode_data_disp: row.periode_pemutakhiran || "-",
        nama_data_disp: row.nama_dataset || "-",
        produsen_data_disp: row.produsen_data || "-",
        hak_akses_disp: toDisplayHakAkses(row.access_level),
        jenis_data_disp: toDisplayJenis(row.jenis_data),
        kategori_data_disp: toDisplayKategori(row),
        status_data_disp: toDisplayStatus(row.status),
      };
    });

    // FE lock: BIDANG + KEPALA_BIDANG hanya bidang sendiri (kecuali canSeeAll)
    if (isBidangLike && !canSeeAll && bidangId != null) {
      rows = rows.filter((r) => Number(r.bidang_id) === Number(bidangId));
    }

    // client-side filters (yang backend belum support)
    const ha = normUpper(hakAkses);
    if (ha && ha !== "SEMUA") rows = rows.filter((r) => normUpper(r.access_level) === ha);

    const jd = normUpper(jenisData);
    if (jd && jd !== "SEMUA") rows = rows.filter((r) => normUpper(r.jenis_data) === jd);

    const kat = normUpper(kategori);
    if (kat && kat !== "SEMUA") rows = rows.filter((r) => normUpper(toDisplayKategori(r)) === kat);

    const per = normUpper(periodeData);
    if (per && per !== "SEMUA") rows = rows.filter((r) => normUpper(r.periode_pemutakhiran) === per);

    const prod = String(produsen || "").trim().toLowerCase();
    if (prod) rows = rows.filter((r) => String(r.produsen_data || "").toLowerCase().includes(prod));

    return rows;
  }, [items, isBidangLike, canSeeAll, bidangId, hakAkses, jenisData, kategori, periodeData, produsen]);

  const roleCtx = useMemo(() => ({ isBidang, isKepalaBidang, isPusdatin }), [isBidang, isKepalaBidang, isPusdatin]);

  const gridColumns = useMemo(
    () => [
      { field: "created_at_disp", headerName: "Tanggal Dibuat", flex: 1, minWidth: 170 },
      { field: "updated_at_disp", headerName: "Tanggal Diperbarui", flex: 1, minWidth: 180 },
      { field: "periode_data_disp", headerName: "Periode Pemutakhiran", flex: 1, minWidth: 180 },
      { field: "nama_data_disp", headerName: "Nama Data", flex: 1.4, minWidth: 220 },
      { field: "produsen_data_disp", headerName: "Produsen Data", flex: 1.1, minWidth: 180 },
      { field: "hak_akses_disp", headerName: "Hak Akses Data", flex: 1, minWidth: 150 },
      { field: "jenis_data_disp", headerName: "Jenis Data", flex: 1.1, minWidth: 160 },
      { field: "kategori_data_disp", headerName: "Kategori Data", flex: 1, minWidth: 140 },
      { field: "status_data_disp", headerName: "Status Data", flex: 1.1, minWidth: 170 },
      {
        field: "aksi",
        headerName: "Aksi",
        sortable: false,
        filterable: false,
        minWidth: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => (
          <ActionMenu
            row={params.row}
            roleCtx={roleCtx}
            onNavigate={(path) => nav(path)}
            onRequestDelete={(row) => setDeleteTarget(row)}
          />
        ),
      },
    ],
    [nav, roleCtx]
  );

  const activeFilters = useMemo(() => {
    const chips = [];
    const qq = String(q || "").trim();
    if (qq) chips.push({ k: "Nama", v: qq });
    if (produsen) chips.push({ k: "Produsen", v: produsen });
    if (hakAkses && hakAkses !== "Semua") chips.push({ k: "Hak Akses", v: hakAkses });
    if (jenisData && jenisData !== "Semua") chips.push({ k: "Jenis", v: jenisData });
    if (kategori && kategori !== "Semua") chips.push({ k: "Kategori", v: kategori });
    if (statusData && statusData !== "Semua") chips.push({ k: "Status", v: statusData });
    if (periodeData && periodeData !== "Semua") chips.push({ k: "Periode", v: periodeData });
    return chips;
  }, [q, produsen, hakAkses, jenisData, kategori, statusData, periodeData]);

  const resetFilter = () => {
    setQ("");
    setProdusen("");
    setHakAkses("Semua");
    setJenisData("Semua");
    setKategori("Semua");
    setStatusData("Semua");
    setPeriodeData("Semua");
    setPage(0);
  };

  const handleGoCreate = () => nav("/datasets/create");

  // Placeholder delete action (belum panggil API delete)
  const confirmDelete = async () => {
    if (!deleteTarget?.dataset_id) return;
    try {
      setDeleteLoading(true);
      showToast("info", `Placeholder: hapus dataset ${deleteTarget.nama_data_disp}`);
      setDeleteTarget(null);
    } catch (e) {
      showToast("error", e?.message || "Gagal hapus dataset.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      {/* TOAST */}
      <Snackbar open={toast.open} autoHideDuration={3500} onClose={closeToast} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>

      {/* HEADER */}
      <Box sx={{ display: "flex", alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Kumpulan Dataset
          </Typography>
          {/* <Typography color="text.secondary">Cari dataset, gunakan filter, lalu kelola metadata & file.</Typography>
          <Typography variant="caption" sx={{ color: "rgba(2,6,23,0.55)" }}>
            API: <b>{API_BASE || "(belum terbaca)"}</b>
          </Typography> */}
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant={openFilter ? "contained" : "outlined"}
            startIcon={<FilterAltOutlinedIcon />}
            onClick={() => setOpenFilter((v) => !v)}
            sx={{
              borderRadius: 999,
              fontWeight: 900,
              ...(openFilter
                ? {}
                : {
                    borderColor: "rgba(11,58,83,0.35)",
                    color: NAVY,
                    "&:hover": { borderColor: NAVY },
                  }),
            }}
          >
            Filter
          </Button>

          <Button
            variant="outlined"
            startIcon={fetching ? <CircularProgress size={16} /> : <RefreshRoundedIcon />}
            onClick={() => fetchDatasets()}
            sx={{ borderRadius: 999, fontWeight: 900 }}
            disabled={fetching}
          >
            Refresh
          </Button>

          {/* hanya tampil untuk BIDANG & KEPALA_BIDANG */}
          {!authLoading && isBidangLike && (
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{ borderRadius: 999, fontWeight: 900, bgcolor: NAVY, "&:hover": { bgcolor: "#082C41" }, px: 2.2 }}
              onClick={handleGoCreate}
            >
              Tambah Data
            </Button>
          )}
        </Stack>
      </Box>

      {/* FILTER CARD */}
      <Paper sx={{ borderRadius: 4, overflow: "hidden", mb: 2 }}>
        <Collapse in={openFilter} timeout={220} unmountOnExit>
          <Box sx={{ p: 2.5 }}>
            <Grid container spacing={1.6} alignItems="center">
              {/* Search */}
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Nama Data"
                  placeholder="Cari Nama Data"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Hak Akses */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <Typography variant="caption" sx={{ mb: 0.5, color: "text.secondary" }}>
                    Hak Akses Data
                  </Typography>
                  <Select value={hakAkses} onChange={(e) => setHakAkses(e.target.value)} displayEmpty>
                    {OPT_HAK_AKSES.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x === "Semua" ? "Semua" : toDisplayHakAkses(x)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Jenis Data */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <Typography variant="caption" sx={{ mb: 0.5, color: "text.secondary" }}>
                    Jenis Data
                  </Typography>
                  <Select value={jenisData} onChange={(e) => setJenisData(e.target.value)} displayEmpty>
                    {OPT_JENIS.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x === "Semua" ? "Semua" : toDisplayJenis(x)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Kategori */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <Typography variant="caption" sx={{ mb: 0.5, color: "text.secondary" }}>
                    Kategori Data
                  </Typography>
                  <Select value={kategori} onChange={(e) => setKategori(e.target.value)} displayEmpty>
                    {OPT_KATEGORI.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x === "Semua" ? "Semua" : x}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Status (dikirim ke API) */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <Typography variant="caption" sx={{ mb: 0.5, color: "text.secondary" }}>
                    Status Data
                  </Typography>
                  <Select
                    value={statusData}
                    onChange={(e) => {
                      setStatusData(e.target.value);
                      setPage(0);
                    }}
                    displayEmpty
                  >
                    {OPT_STATUS.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x === "Semua" ? "Semua" : toDisplayStatus(x)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Periode */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <Typography variant="caption" sx={{ mb: 0.5, color: "text.secondary" }}>
                    Periode Pemutakhiran
                  </Typography>
                  <Select value={periodeData} onChange={(e) => setPeriodeData(e.target.value)} displayEmpty>
                    {OPT_PERIODE.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x === "Semua" ? "Semua" : x}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Produsen */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Produsen Data"
                  placeholder="Contoh: PUSDATIN DPRKP"
                  value={produsen}
                  onChange={(e) => setProdusen(e.target.value)}
                />
              </Grid>

              {/* Chips */}
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {activeFilters.length ? (
                    activeFilters.map((c) => (
                      <Chip key={`${c.k}-${c.v}`} label={`${c.k}: ${c.v}`} variant="outlined" sx={{ borderRadius: 999 }} />
                    ))
                  ) : (
                    <Chip label="Tidak ada filter aktif" variant="outlined" sx={{ borderRadius: 999 }} />
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" color="error" onClick={resetFilter} startIcon={<RestartAltRoundedIcon />} sx={{ borderRadius: 999, fontWeight: 900 }}>
                    Hapus Filter
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          <Divider />
        </Collapse>

        {/* TABLE */}
        <Box sx={{ p: 2.5 }}>
          <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
            <DataGrid
              autoHeight
              rows={filteredRows}
              columns={gridColumns}
              getRowId={(r) => r.dataset_id}
              loading={fetching}
              rowCount={total}
              paginationMode="server"
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(m) => {
                setPage(m.page);
                setPageSize(m.pageSize);
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
              localeText={{ noRowsLabel: "Tidak ada data" }}
            />
          </Paper>

          <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>

            <Stack direction="row" spacing={1}>
              <Button variant="outlined" sx={{ borderRadius: 999, fontWeight: 900 }}>
                CSV
              </Button>
              <Button variant="outlined" sx={{ borderRadius: 999, fontWeight: 900 }}>
                Excel
              </Button>
              <Button variant="outlined" sx={{ borderRadius: 999, fontWeight: 900 }}>
                PDF
              </Button>
            </Stack>
          </Box>
        </Box>
      </Paper>

      {/* DELETE CONFIRM (placeholder) */}
      {deleteTarget && (
        <Paper sx={{ mt: 2, p: 2, borderRadius: 3, border: "1px solid rgba(239,68,68,0.25)", bgcolor: "rgba(239,68,68,0.04)" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 900, color: "error.main" }}>Konfirmasi Hapus Dataset</Typography>
              <Typography variant="body2" color="text.secondary">
                Dataset: <b>{deleteTarget?.nama_data_disp}</b> — (placeholder, belum hit API delete)
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setDeleteTarget(null)} sx={{ borderRadius: 999, fontWeight: 900 }} disabled={deleteLoading}>
                Batal
              </Button>
              <Button color="error" variant="contained" onClick={confirmDelete} sx={{ borderRadius: 999, fontWeight: 900 }} disabled={deleteLoading}>
                {deleteLoading ? "Memproses..." : "Hapus"}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}