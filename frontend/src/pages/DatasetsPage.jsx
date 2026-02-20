// src/pages/DatasetsPage.jsx
import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from "@mui/material";

import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";

import { DataGrid } from "@mui/x-data-grid";

const NAVY = "#0B3A53";

const OPT_HAK_AKSES = ["Terbuka", "Terbatas", "Tertutup"];
const OPT_JENIS = ["Data Terstruktur", "Data Tidak Terstruktur"];
const OPT_KATEGORI = ["SDI", "non SDI", "DSSD", "non DSSD"];
const OPT_STATUS = [
  "Draft",
  "Data Diajukan",
  "Ditolak Kepala Bidang",
  "Diterima Kepala Bidang",
  "Ditolak Pusdatin",
  "Selesai",
  "Hapus",
];
const OPT_PERIODE = [
  "1 Minggu Sekali",
  "1 Bulan Sekali",
  "3 Bulan Sekali",
  "6 Bulan Sekali",
  "1 Tahun Sekali",
  "5 Tahun Sekali",
];

function ActionButtons() {
  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Lihat Filedata">
        <IconButton size="small">
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Update Filedata">
        <IconButton size="small">
          <CloudDownloadOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit Metadata">
        <IconButton size="small">
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Lihat Metadata">
        <IconButton size="small">
          <DescriptionOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Pelacakan Data">
        <IconButton size="small">
          <TimelineOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export default function DatasetsPage() {
  const [openFilter, setOpenFilter] = useState(true);

  const [q, setQ] = useState("");
  const [hakAkses, setHakAkses] = useState("");
  const [jenisData, setJenisData] = useState("");
  const [kategori, setKategori] = useState("");
  const [statusData, setStatusData] = useState("");
  const [periodeData, setPeriodeData] = useState("");
  const [produsen, setProdusen] = useState("");

  // contoh data kosong (tinggal sambung API)
  const rows = useMemo(() => [], []);

  const columns = useMemo(
    () => [
      { field: "created_at", headerName: "Tanggal Dibuat", flex: 1, minWidth: 140 },
      { field: "updated_at", headerName: "Tanggal Diperbarui", flex: 1, minWidth: 160 },
      { field: "periode_data", headerName: "Periode Data", flex: 1, minWidth: 150 },
      { field: "nama_data", headerName: "Nama Data", flex: 1.4, minWidth: 200 },
      { field: "produsen_data", headerName: "Produsen Data", flex: 1.1, minWidth: 160 },
      { field: "hak_akses", headerName: "Hak Akses Data", flex: 1, minWidth: 150 },
      { field: "jenis_data", headerName: "Jenis Data", flex: 1.1, minWidth: 150 },
      { field: "kategori_data", headerName: "Kategori Data", flex: 1, minWidth: 140 },
      { field: "status_data", headerName: "Status Data", flex: 1.1, minWidth: 160 },
      {
        field: "aksi",
        headerName: "Aksi",
        sortable: false,
        filterable: false,
        minWidth: 220,
        renderCell: () => <ActionButtons />,
      },
    ],
    []
  );

  const activeFilters = useMemo(() => {
    const chips = [];
    if (q) chips.push({ k: "Nama", v: q });
    if (produsen) chips.push({ k: "Produsen", v: produsen });
    if (hakAkses) chips.push({ k: "Hak Akses", v: hakAkses });
    if (jenisData) chips.push({ k: "Jenis", v: jenisData });
    if (kategori) chips.push({ k: "Kategori", v: kategori });
    if (statusData) chips.push({ k: "Status", v: statusData });
    if (periodeData) chips.push({ k: "Periode", v: periodeData });
    return chips;
  }, [q, produsen, hakAkses, jenisData, kategori, statusData, periodeData]);

  const resetFilter = () => {
    setQ("");
    setProdusen("");
    setHakAkses("");
    setJenisData("");
    setKategori("");
    setStatusData("");
    setPeriodeData("");
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: "auto" }}>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Kumpulan Dataset
          </Typography>
          <Typography color="text.secondary">
            Cari dataset, gunakan filter, lalu kelola metadata & file.
          </Typography>
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
            variant="contained"
            startIcon={<AddRoundedIcon />}
            sx={{
              borderRadius: 999,
              fontWeight: 900,
              bgcolor: NAVY,
              "&:hover": { bgcolor: "#082C41" },
              px: 2.2,
            }}
            onClick={() => {
              // TODO: arahkan ke halaman create dataset / open dialog
              // nav("/datasets/create")
              alert("TODO: Buat Dataset (hubungkan ke halaman/form create).");
            }}
          >
            Tambah Data
          </Button>
        </Stack>
      </Box>

      {/* FILTER CARD (dimaksimalkan) */}
      <Paper
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          mb: 2,
        }}
      >
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
                  onChange={(e) => setQ(e.target.value)}
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
                    <MenuItem value="">Semua</MenuItem>
                    {OPT_HAK_AKSES.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x}
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
                    <MenuItem value="">Semua</MenuItem>
                    {OPT_JENIS.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x}
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
                    <MenuItem value="">Semua</MenuItem>
                    {OPT_KATEGORI.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Status */}
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <Typography variant="caption" sx={{ mb: 0.5, color: "text.secondary" }}>
                    Status Data
                  </Typography>
                  <Select value={statusData} onChange={(e) => setStatusData(e.target.value)} displayEmpty>
                    <MenuItem value="">Semua</MenuItem>
                    {OPT_STATUS.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Periode */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <Typography variant="caption" sx={{ mb: 0.5, color: "text.secondary" }}>
                    Periode Data
                  </Typography>
                  <Select value={periodeData} onChange={(e) => setPeriodeData(e.target.value)} displayEmpty>
                    <MenuItem value="">Semua</MenuItem>
                    {OPT_PERIODE.map((x) => (
                      <MenuItem key={x} value={x}>
                        {x}
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
                  placeholder="Contoh: Bidang Perumahan"
                  value={produsen}
                  onChange={(e) => setProdusen(e.target.value)}
                />
              </Grid>

              {/* Actions */}
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  {activeFilters.length ? (
                    activeFilters.map((c) => (
                      <Chip
                        key={`${c.k}-${c.v}`}
                        label={`${c.k}: ${c.v}`}
                        variant="outlined"
                        sx={{ borderRadius: 999 }}
                      />
                    ))
                  ) : (
                    <Chip label="Tidak ada filter aktif" variant="outlined" sx={{ borderRadius: 999 }} />
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={resetFilter}
                    startIcon={<RestartAltRoundedIcon />}
                    sx={{ borderRadius: 999, fontWeight: 900 }}
                  >
                    Hapus Filter
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          <Divider />
        </Collapse>

        {/* TABLE AREA */}
        <Box sx={{ p: 2.5 }}>
          <Paper
            sx={{
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <DataGrid
              autoHeight
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id || r.dataset_id}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
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
              localeText={{
                noRowsLabel: "Tidak ada data",
              }}
            />
          </Paper>

          {/* Footer actions: export small buttons (tanpa tombol export di header) */}
          <Box
            sx={{
              mt: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Menampilkan data sesuai filter. Gunakan tombol unduh untuk mengunduh list.
            </Typography>

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
    </Box>
  );
}