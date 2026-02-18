import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Typography, TextField, Button, Stack,
  Menu, MenuItem, Chip, FormControl, InputLabel, Select
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import IconButton from "@mui/material/IconButton";
import { DataGrid } from "@mui/x-data-grid";
import { fetchDatasets } from "../../services/datasets";

function StatusChip({ value }) {
  const v = String(value || "").toUpperCase();
  if (v === "DRAFT") return <Chip label="Draft" size="small" />;
  if (v === "SUBMITTED") return <Chip label="Menunggu" size="small" color="warning" />;
  if (v === "APPROVED_KABID") return <Chip label="Disetujui Kabid" size="small" color="info" />;
  if (v === "VERIFIED_PUSDATIN") return <Chip label="Terverifikasi" size="small" color="success" />;
  if (v === "REJECTED") return <Chip label="Ditolak" size="small" color="error" />;
  return <Chip label={value || "-"} size="small" variant="outlined" />;
}

function AccessChip({ value }) {
  const v = String(value || "").toUpperCase();
  if (v === "TERBUKA") return <Chip label="Terbuka" size="small" color="primary" />;
  if (v === "TERBATAS") return <Chip label="Terbatas" size="small" color="warning" />;
  if (v === "RAHASIA") return <Chip label="Rahasia" size="small" color="error" />;
  return <Chip label={value || "-"} size="small" variant="outlined" />;
}

function ActionMenu({ row, onAction }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); onAction("detail", row); }}>
          Detail Metadata
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onAction("records", row); }}>
          Lihat Data (Records)
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onAction("edit", row); }}>
          Edit Metadata
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onAction("log", row); }}>
          Pelacakan / Log
        </MenuItem>
      </Menu>
    </>
  );
}

export default function DatasetListPage() {
  const [loading, setLoading] = useState(false);

  // filter state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [periodeData, setPeriodeData] = useState(""); // mingguan/bulanan/dst (kolom periode_data)
  const [page, setPage] = useState(0); // DataGrid 0-based
  const [pageSize, setPageSize] = useState(10);

  // data
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);

  const columns = useMemo(() => ([
    {
      field: "created_at",
      headerName: "Tanggal Dibuat",
      width: 160,
      valueGetter: (p) => p.row.created_at ? new Date(p.row.created_at).toLocaleString("id-ID") : "-"
    },
    {
      field: "updated_at",
      headerName: "Tanggal Diperbarui",
      width: 170,
      valueGetter: (p) => p.row.updated_at ? new Date(p.row.updated_at).toLocaleString("id-ID") : "-"
    },
    { field: "nama_dataset", headerName: "Nama Data", flex: 1, minWidth: 280 },
    { field: "sumber_data", headerName: "Produsen Data", width: 220, valueGetter: (p) => p.row.sumber_data || "-" },
    {
      field: "cakupan_wilayah",
      headerName: "Cakupan Wilayah",
      width: 180,
      valueGetter: (p) => p.row.cakupan_wilayah || "-"
    },
    {
      field: "frekuensi_update",
      headerName: "Frekuensi Update",
      width: 160,
      valueGetter: (p) => p.row.frekuensi_update || "-"
    },
    {
      field: "hak_akses",
      headerName: "Hak Akses Data",
      width: 140,
      renderCell: (p) => <AccessChip value={p.row.hak_akses || p.row.hak_akses_data} />
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      renderCell: (p) => <StatusChip value={p.row.status} />
    },
    {
      field: "periode_data",
      headerName: "Periode Data",
      width: 160,
      valueGetter: (p) => p.row.periode_data || "-"
    },
    {
      field: "aksi",
      headerName: "Aksi",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <ActionMenu
          row={p.row}
          onAction={(type, row) => {
            // nanti kita arahkan ke route/ dialog
            console.log("ACTION", type, row);
          }}
        />
      )
    }
  ]), []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchDatasets({
        q: q || undefined,
        status: status || undefined,
        periode_data: periodeData || undefined,
        page: page + 1, // backend biasanya 1-based
        limit: pageSize,
      });

      // sesuaikan struktur response backend kamu
      // contoh: { data: [...], meta: { total: 123 } }
      const data = res?.data ?? res?.items ?? [];
      const total = res?.meta?.total ?? res?.total ?? data.length;

      // DataGrid butuh id unik: pakai dataset_id
      setRows(data.map((d) => ({ id: d.dataset_id, ...d })));
      setRowCount(total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, pageSize]); // paging
  // filter: trigger manual via tombol "Terapkan Filter" biar gak spam request

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Kumpulan Data</Typography>
            <Typography variant="body2" color="text.secondary">Daftar seluruh dataset</Typography>
          </Box>

          <Button variant="contained" startIcon={<AddIcon />}>
            Buat Dataset
          </Button>
        </Stack>

        {/* Filter */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
          <TextField
            label="Cari Nama Data"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="">Semua</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="SUBMITTED">Menunggu</MenuItem>
              <MenuItem value="APPROVED_KABID">Approved Kabid</MenuItem>
              <MenuItem value="VERIFIED_PUSDATIN">Verified Pusdatin</MenuItem>
              <MenuItem value="REJECTED">Ditolak</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Periode Data</InputLabel>
            <Select
              label="Periode Data"
              value={periodeData}
              onChange={(e) => setPeriodeData(e.target.value)}
            >
              <MenuItem value="">Semua</MenuItem>
              <MenuItem value="MINGGUAN">1 Minggu</MenuItem>
              <MenuItem value="BULANAN">1 Bulan</MenuItem>
              <MenuItem value="TRIWULAN">3 Bulan</MenuItem>
              <MenuItem value="SEMESTER">6 Bulan</MenuItem>
              <MenuItem value="TAHUNAN">1 Tahun</MenuItem>
              <MenuItem value="LIMA_TAHUN">5 Tahun</MenuItem>
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", md: "auto" } }}>
            <Button
              variant="contained"
              onClick={() => { setPage(0); load(); }}
              fullWidth
            >
              Terapkan
            </Button>
            <Button
              variant="outlined"
              onClick={() => { setQ(""); setStatus(""); setPeriodeData(""); setPage(0); }}
              fullWidth
            >
              Reset
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ height: 560 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          paginationMode="server"
          rowCount={rowCount}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
          pageSizeOptions={[5, 10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Paper>
    </Box>
  );
}
