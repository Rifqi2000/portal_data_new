import { useEffect, useState } from "react";
import { approvalsApi } from "../api/approvals.api";
import { Box, Paper, Typography, Button, Stack } from "@mui/material";

export default function ApprovalKabidPage() {
  const [rows, setRows] = useState([]);

  async function load() {
    const res = await approvalsApi.listKabid();
    setRows(res.data?.data?.items || res.data?.data || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Approvals Kabid</Typography>
      <Paper sx={{ p: 2, borderRadius: 3 }}>
        {rows.map((r) => (
          <Stack key={r.dataset_id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1 }}>
            <div>
              <Typography sx={{ fontWeight: 700 }}>{r.nama_dataset}</Typography>
              <Typography variant="body2" color="text.secondary">{r.status}</Typography>
            </div>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => approvalsApi.approveKabid(r.dataset_id).then(load)}>
                Approve
              </Button>
              <Button variant="outlined" onClick={() => approvalsApi.rejectKabid(r.dataset_id, { reason: "Perbaiki data" }).then(load)}>
                Reject
              </Button>
            </Stack>
          </Stack>
        ))}
      </Paper>
    </Box>
  );
}
