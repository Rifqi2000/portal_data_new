// src/pages/DashboardPage.jsx
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
  Divider,
  Skeleton,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HourglassBottomRoundedIcon from "@mui/icons-material/HourglassBottomRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";

import { api } from "../lib/api";
import { COLORS } from "../app/theme";

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

function monthLabel(m) {
  const mm = Number(m);
  const names = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  return names[mm - 1] || String(m);
}

function SummaryCard({ title, value, loading, icon, accent = "navy" }) {
  const accentMap = {
    green: { bg: "rgba(46,125,50,0.10)", color: COLORS.green },
    orange: { bg: "rgba(245,124,0,0.10)", color: COLORS.orange },
    navy: { bg: "rgba(11,58,83,0.08)", color: COLORS.navy },
    red: { bg: "rgba(211,47,47,0.10)", color: "#D32F2F" },
  };
  const a = accentMap[accent] || accentMap.navy;

  return (
    <Card
      sx={{
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* accent bar */}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          bgcolor: a.color,
          opacity: 0.9,
        }}
      />
      <CardContent sx={{ pl: 2.6 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 700 }}>
            {title}
          </Typography>

          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: a.bg,
              color: a.color,
              display: "grid",
              placeItems: "center",
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 900, color: "text.primary" }}>
          {loading ? <Skeleton width={64} /> : value}
        </Typography>

        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Update real-time dari sistem
        </Typography>
      </CardContent>
    </Card>
  );
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
    periode_data: "",
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
    const labels = (charts.uploads_by_month || []).map((x) => monthLabel(x.month));
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

  // reload when filters change
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

  const isAnyLoading = loading.summary || loading.schedule || loading.charts;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: COLORS.navy }}>
          Dashboard
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>
          Ringkasan pengumpulan data, jadwal, dan aktivitas unduhan.
        </Typography>
      </Box>

      {/* Filters */}
      <Card
        sx={{
          mb: 3,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 500px at 10% 10%, rgba(245,124,0,0.10), transparent 55%)," +
              "radial-gradient(900px 500px at 80% 30%, rgba(46,125,50,0.10), transparent 55%)," +
              "radial-gradient(900px 600px at 50% 90%, rgba(11,58,83,0.10), transparent 55%)",
            pointerEvents: "none",
          }}
        />
        <CardContent sx={{ position: "relative" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Bulan</InputLabel>
                <Select
                  label="Bulan"
                  value={filters.month}
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, month: Number(e.target.value) }))
                  }
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {i + 1} - {monthLabel(i + 1)}
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
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, status: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setFilters((s) => ({ ...s, year: Number(e.target.value) }))
                  }
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
              <Button
                variant="outlined"
                fullWidth
                onClick={handleReset}
                startIcon={<RestartAltRoundedIcon />}
              >
                Reset
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<CalendarMonthRoundedIcon />}
                  label={`Bulan: ${filters.month} (${monthLabel(filters.month)})`}
                  sx={{ fontWeight: 800 }}
                />
                <Chip label={`Tahun: ${filters.year}`} sx={{ fontWeight: 800 }} />
                {filters.status && (
                  <Chip
                    label={`Status: ${statusLabel(filters.status)}`}
                    sx={{ fontWeight: 800 }}
                  />
                )}
                {filters.periode_data && (
                  <Chip
                    label={`Periode: ${filters.periode_data}`}
                    sx={{ fontWeight: 800 }}
                  />
                )}
                {isAnyLoading && (
                  <Chip
                    label="Memuat data..."
                    icon={<CircularProgress size={14} />}
                    sx={{ fontWeight: 800 }}
                  />
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary */}
      {error.summary && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.summary}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <SummaryCard
            title="Data Terkumpul"
            value={summary?.total ?? 0}
            loading={loading.summary}
            accent="navy"
            icon={<Inventory2RoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard
            title="Diterima"
            value={summary?.approved ?? 0}
            loading={loading.summary}
            accent="green"
            icon={<CheckCircleRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard
            title="Menunggu Verifikasi"
            value={summary?.pending ?? 0}
            loading={loading.summary}
            accent="orange"
            icon={<HourglassBottomRoundedIcon />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard
            title="Ditolak"
            value={summary?.rejected ?? 0}
            loading={loading.summary}
            accent="red"
            icon={<CancelRoundedIcon />}
          />
        </Grid>
      </Grid>

      {/* Schedule + Charts */}
      <Grid container spacing={2}>
        {/* Schedule */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: COLORS.navy }}>
                    Jadwal Pengumpulan Data
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Bulan {schedule.month} • tampil {schedule.limit} per halaman
                  </Typography>
                </Box>
                {loading.schedule && <CircularProgress size={20} />}
              </Box>

              {error.schedule && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error.schedule}
                </Alert>
              )}

              <Box
                sx={{
                  borderRadius: 3,
                  overflow: "hidden",
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "rgba(11,58,83,0.04)" }}>
                      <TableCell sx={{ fontWeight: 900 }}>Nama Dataset</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Periode</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Frekuensi</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading.schedule ? (
                      Array.from({ length: schedule.limit }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Skeleton /></TableCell>
                          <TableCell><Skeleton /></TableCell>
                          <TableCell><Skeleton /></TableCell>
                          <TableCell><Skeleton width={90} /></TableCell>
                        </TableRow>
                      ))
                    ) : schedule.items?.length ? (
                      schedule.items.map((r) => (
                        <TableRow key={r.dataset_id} hover>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {r.nama_dataset || "-"}
                          </TableCell>
                          <TableCell>{r.periode_data || "-"}</TableCell>
                          <TableCell>{r.frekuensi_update || "-"}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={statusLabel(r.status)}
                              color={statusChipColor(r.status)}
                              variant="outlined"
                              sx={{ fontWeight: 800 }}
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
              </Box>

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

        {/* Charts */}
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: COLORS.navy }}>
                    Pengumpulan Data per Bulan
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Tahun {filters.year}
                  </Typography>
                </Box>
                {loading.charts && <CircularProgress size={20} />}
              </Box>

              {error.charts && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error.charts}
                </Alert>
              )}

              {loading.charts ? (
                <Skeleton variant="rounded" height={260} />
              ) : barData.labels.length ? (
                <BarChart
                  xAxis={[{ scaleType: "band", data: barData.labels }]}
                  series={[{ data: barData.values, label: "Jumlah Dataset" }]}
                  height={260}
                  margin={{ left: 50, right: 10, top: 20, bottom: 40 }}
                />
              ) : (
                <Typography color="text.secondary">Belum ada data chart.</Typography>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 900, color: COLORS.navy }}>
                Dataset Paling Sering Diunduh
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
                Ringkasan aktivitas download.
              </Typography>

              <Divider sx={{ mb: 1.5 }} />

              {loading.charts ? (
                <Stack spacing={1}>
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                </Stack>
              ) : charts.top_downloaded?.length ? (
                <Stack spacing={1}>
                  {charts.top_downloaded.map((x) => (
                    <Box
                      key={x.dataset_id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 2,
                        p: 1.2,
                        borderRadius: 2,
                        bgcolor: "rgba(11,58,83,0.04)",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ flex: 1, fontWeight: 800 }}
                        noWrap
                        title={x.nama_dataset}
                      >
                        {x.nama_dataset}
                      </Typography>

                      <Chip
                        size="small"
                        label={Number(x.downloads || 0)}
                        sx={{
                          fontWeight: 900,
                          bgcolor: "rgba(46,125,50,0.12)",
                          color: COLORS.green,
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
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
