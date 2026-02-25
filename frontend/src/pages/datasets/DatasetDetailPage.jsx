// src/pages/DatasetDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Box, CircularProgress, Paper, Typography } from "@mui/material";
import DatasetMetadataForm from "../DatasetMetadataForm";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function getToken() {
  return (
    localStorage.getItem("pd_access_token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

function extractErrorMessage(json, fallback) {
  if (!json) return fallback;
  if (typeof json === "string") return json;
  return json?.message || json?.error?.message || json?.error || json?.msg || fallback;
}

export default function DatasetDetailPage() {
  const { dataset_id } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);

        if (!API_BASE) throw new Error("VITE_API_BASE_URL belum di-set");

        const token = getToken();
        const res = await fetch(`${API_BASE}/datasets/${dataset_id}`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(extractErrorMessage(json, `Gagal load dataset (HTTP ${res.status})`));
        }

        setData(json?.data || null);
      } catch (e) {
        setErr(e?.message || "Gagal load dataset");
      } finally {
        setLoading(false);
      }
    })();
  }, [dataset_id]);

  if (loading) {
    return (
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 2, py: 3 }}>
        <Paper sx={{ p: 3 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2, fontWeight: 800 }}>Memuat metadata...</Typography>
        </Paper>
      </Box>
    );
  }

  if (err) {
    return (
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 2, py: 3 }}>
        <Alert severity="error" variant="filled">{err}</Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ maxWidth: 1400, mx: "auto", px: 2, py: 3 }}>
        <Alert severity="warning" variant="filled">Data tidak ditemukan.</Alert>
      </Box>
    );
  }

  return (
    <DatasetMetadataForm
      mode="view"
      title="LIHAT METADATA"
      datasetId={dataset_id}
      data={data}
    />
  );
}