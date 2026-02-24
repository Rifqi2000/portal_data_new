import { Box, Paper, Typography } from "@mui/material";
import { useParams } from "react-router-dom";

export default function DatasetApproveKabidPage() {
  const { datasetId } = useParams();
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Approve Kepala Bidang
        </Typography>
        <Typography color="text.secondary">
          Dataset ID: {datasetId}
        </Typography>
        <Typography sx={{ mt: 2 }}>
          (Placeholder) Nanti: tampil metadata + data upload, lalu tombol Approve / Reject + alasan.
        </Typography>
      </Paper>
    </Box>
  );
}