import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { datasetsApi } from "../api/datasets.api";
import { uploadsApi } from "../api/uploads.api";
import { Box, Paper, Typography, Button, Divider, Alert } from "@mui/material";

export default function DatasetDetailPage() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await datasetsApi.detail(id);
    setDetail(res.data?.data);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function downloadTemplate() {
    const res = await datasetsApi.templateCsv(id);
    const blob = new Blob([res.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail?.nama_dataset || "template"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    try {
      const r = await uploadsApi.uploadDatasetFile(id, file);
      setMsg(`Upload sukses. Deleted: ${r.data?.data?.records?.deleted} Inserted: ${r.data?.data?.records?.inserted}`);
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.error?.message || "Upload gagal.");
    } finally {
      e.target.value = "";
    }
  }

  if (!detail) return null;

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
        Detail Dataset
      </Typography>

      {msg && <Alert sx={{ mb: 2 }} severity={msg.includes("sukses") ? "success" : "error"}>{msg}</Alert>}

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Typography sx={{ fontWeight: 800 }}>{detail.nama_dataset}</Typography>
        <Typography variant="body2" color="text.secondary">
          Status: {detail.status} • Jenis: {detail.jenis_data}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Button variant="outlined" onClick={downloadTemplate} sx={{ mr: 1 }}>
          Download Template CSV
        </Button>

        {/* Upload (BIDANG saja → nanti kita hide berdasarkan role) */}
        <Button variant="contained" component="label">
          Upload File
          <input type="file" hidden onChange={onUpload} />
        </Button>
      </Paper>
    </Box>
  );
}
