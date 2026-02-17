import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { datasetsApi } from "../api/datasets.api";
import { Box, Paper, Typography, TextField, List, ListItemButton, ListItemText } from "@mui/material";

export default function DashboardPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const res = await datasetsApi.list();
      setRows(res.data?.data?.items || res.data?.data || []);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    String(r.nama_dataset || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
        Daftar Dataset
      </Typography>

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <TextField
          fullWidth
          placeholder="Cari nama dataset..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ mb: 2 }}
        />

        <List>
          {filtered.map((d) => (
            <ListItemButton key={d.dataset_id} onClick={() => nav(`/datasets/${d.dataset_id}`)}>
              <ListItemText
                primary={d.nama_dataset}
                secondary={`Status: ${d.status} • Jenis: ${d.jenis_data}`}
              />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
