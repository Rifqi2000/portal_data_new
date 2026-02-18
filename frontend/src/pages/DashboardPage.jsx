import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
  Stack,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { api } from "../lib/api";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "APPROVED", label: "Diterima" },
  { value: "PENDING", label: "Menunggu Verifikasi" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Diajukan" },
  { value: "VERIFIED", label: "Terverifikasi" },
];

function statusLabel(s) {
  const key = String(s || "").toUpperCase();
  return STATUS_OPTIONS.find((x) => x.value === key)?.label || key || "-";
}

function statusChipColor(s) {
  const key = String(s || "").toUpperCase();
  if (key === "APPROVED" || key === "VERIFIED") return "success";
  if (key === "PENDING" || key === "SUBMITTED") return "warning";
  if (key === "REJECTED") return "error";
  if (key === "DRAFT") return "default";
  return "default";
}

export default function DashboardPage() {
  const now = new Date();
  const nowMonth = now.getMonth() + 1;
  const nowYear = now.getFullYear();

  const [loading, setLoading] = useState({
    summary: false,
    schedule: false,
    charts: false,
  });

  const [error, setError] = useState({
    summary: "",
    schedule: "",
    charts: "",
  });

  const [summary, setSummary] = useState(null);

  const [filters, setFilters] = useState({
    month: nowMonth,
    periode_data: "", // opsional (kalau backend sudah support list periode, nanti bisa dibuat dropdown)
    status: "",
    year: nowYear,
  });

  const [schedule, setSchedule] = useState({
    items: [],
    total: 0,
    page: 1,
    limit: 5,
    month: nowMonth,
  });

  const [charts, setCharts] = useState({
    uploads_by_month: [],
    top_downloaded: [],
  });

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((schedule.total || 0) / (schedule.limit || 5)));
  }, [schedule.total, schedule.limit]);

  const barData = useMemo(() => {
    // xCharts butuh array kategori + data series
    const labels = (charts.uploads_by_month || []).map((x) => x.month);
    const values = (charts.uploads_by_month || []).map((x) => Number(x.count || 0));
    return { labels, values };
  }, [charts.uploads_by_month]);

  const loadSummary = useCallback(async () => {
    setLoading((s) => ({ ...s, summary: true }));
    setError((e) => ({ ...e, summary: "" }));
    try {
      const res = await api.get("/dashboard/summary");
      setSummary(res.data?.data || null);
    } catch (err) {
      setError((e) => ({
        ...e,
        summary: err?.response?.data?.message || err.message || "Gagal memuat ringkasan.",
      }));
      setSummary(null);
    } finally {
      setLoading((s) => ({ ...s, summary: false }));
    }
  }, []);

  const loadSchedule = useCallback(
    async (page = 1) => {
      setLoading((s) => ({ ...s, schedule: true }));
      setError((e) => ({ ...e, schedule: "" }));

      try {
        const params = {
          month: filters.month,
          page,
          limit: schedule.limit,
        };
        if (filters.periode_data) params.periode_data = filters.periode_data;
        if (filters.status) params.status = filters.status;

        const res = await api.get("/dashboard/schedule", { params });

        // pastikan shape aman
        const data = res.data?.data || {};
        setSchedule((prev) => ({
          ...prev,
          items: data.items || [],
          total: data.total ?? 0,
          page: data.page ?? page,
          limit: data.limit ?? prev.limit,
          month: data.month ?? filters.month,
        }));
      } catch (err) {
        setError((e) => ({
          ...e,
          schedule: err?.response?.data?.message || err.message || "Gagal memuat jadwal.",
        }));
        setSchedule((prev) => ({ ...prev, items: [], total: 0, page }));
      } finally {
        setLoading((s) => ({ ...s, schedule: false }));
      }
    },
    [filters.month, filters.periode_data, filters.status, schedule.limit]
  );

  const loadCharts = useCallback(async () => {
    setLoading((s) => ({ ...s, charts: true }));
    setError((e) => ({ ...e, charts: "" }));

    try {
      const params = { year: filters.year };
      if (filters.periode_data) params.periode_data = filters.periode_data;
      if (filters.status) params.status = filters.status;

      const res = await api.get("/dashboard/charts", { params });
      const data = res.data?.data || {};
      setCharts({
        uploads_by_month: data.uploads_by_month || [],
        top_downloaded: data.top_downloaded || [],
      });
    } catch (err) {
      setError((e) => ({
        ...e,
        charts: err?.response?.data?.message || err.message || "Gagal memuat chart.",
      }));
      setCharts({ uploads_by_month: [], top_downloaded: [] });
    } finally {
      setLoading((s) => ({ ...s, charts: false }));
    }
  }, [filters.year, filters.periode_data, filters.status]);

  // initial load
  useEffect(() => {
    loadSummary();
    loadSchedule(1);
    loadCharts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload saat filter berubah
  useEffect(() => {
    loadSchedule(1);
    loadCharts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.month, filters.periode_data, filters.status, filters.year]);

  const handleReset = () => {
    setFilters({
      month: nowMonth,
      periode_data: "",
      status: "",
      year: nowYear,
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h4" fontWeight={800}>
          Dashboard
        </Typography>
      </Box>

      {/* FILTER BAR */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Bulan</InputLabel>
                <Select
                  label="Bulan"
                  value={filters.month}
                  onChange={(e) => setFilters((s) => ({ ...s, month: Number(e.target.value) }))}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {i + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={filters.status}
                  onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tahun</InputLabel>
                <Select
                  label="Tahun"
                  value={filters.year}
                  onChange={(e) => setFilters((s) => ({ ...s, year: Number(e.target.value) }))}
                >
                  {[nowYear - 2, nowYear - 1, nowYear, nowYear + 1].map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3} sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" fullWidth onClick={handleReset}>
                Reset Filter
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Bulan: ${filters.month}`} />
                <Chip label={`Tahun: ${filters.year}`} />
                {filters.status && <Chip label={`Status: ${statusLabel(filters.status)}`} />}
                {filters.periode_data && <Chip label={`Periode: ${filters.periode_data}`} />}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* SUMMARY CARDS */}
      {error.summary && <Alert severity="error" sx={{ mb: 2 }}>{error.summary}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Data Terkumpul", value: summary?.total ?? 0 },
          { label: "Diterima", value: summary?.approved ?? 0 },
          { label: "Menunggu Verifikasi", value: summary?.pending ?? 0 },
          { label: "Ditolak", value: summary?.rejected ?? 0 },
        ].map((c) => (
          <Grid item xs={12} md={3} key={c.label}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {c.label}
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {loading.summary ? <CircularProgress size={24} /> : c.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* SCHEDULE + CHARTS */}
      <Grid container spacing={2}>
        {/* Jadwal Pengumpulan Data */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="h6" fontWeight={800}>
                  Jadwal Pengumpulan Data (Bulan {schedule.month})
                </Typography>
                {loading.schedule && <CircularProgress size={20} />}
              </Box>

              {error.schedule && <Alert severity="error" sx={{ mb: 2 }}>{error.schedule}</Alert>}

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Nama Dataset</TableCell>
                    <TableCell>Periode</TableCell>
                    <TableCell>Frekuensi</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.items?.length ? (
                    schedule.items.map((r) => (
                      <TableRow key={r.dataset_id}>
                        <TableCell sx={{ fontWeight: 600 }}>{r.nama_dataset}</TableCell>
                        <TableCell>{r.periode_data || "-"}</TableCell>
                        <TableCell>{r.frekuensi_update || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={statusLabel(r.status)}
                            color={statusChipColor(r.status)}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: "text.secondary" }}>
                        Tidak ada jadwal untuk filter ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Pagination
                  count={totalPages}
                  page={schedule.page || 1}
                  onChange={(_, p) => loadSchedule(p)}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Visualisasi */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="h6" fontWeight={800}>
                  Pengumpulan Data per Bulan
                </Typography>
                {loading.charts && <CircularProgress size={20} />}
              </Box>

              {error.charts && <Alert severity="error" sx={{ mb: 2 }}>{error.charts}</Alert>}

              {barData.labels.length ? (
                <BarChart
                  xAxis={[{ scaleType: "band", data: barData.labels }]}
                  series={[{ data: barData.values, label: "Jumlah Dataset" }]}
                  height={260}
                />
              ) : (
                <Typography color="text.secondary">Belum ada data chart.</Typography>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>
                Dataset Paling Sering Diunduh
              </Typography>

              {charts.top_downloaded?.length ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {charts.top_downloaded.map((x) => (
                    <Box
                      key={x.dataset_id}
                      sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
                    >
                      <Typography variant="body2" sx={{ flex: 1 }} noWrap title={x.nama_dataset}>
                        {x.nama_dataset}
                      </Typography>
                      <Typography variant="body2" fontWeight={800}>
                        {Number(x.downloads || 0)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="text.secondary">
                  Belum ada log download (dataset_activity_log action='DOWNLOAD').
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
