import { Box, Paper, Typography } from "@mui/material";
import { useParams } from "react-router-dom";

export default function DatasetApprovePusdatinPage() {
  const { datasetId } = useParams();
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Approve Pusdatin
        </Typography>
        <Typography color="text.secondary">
          Dataset ID: {datasetId}
        </Typography>
        <Typography sx={{ mt: 2 }}>
          (Placeholder) Nanti: final approval, tampil metadata + data upload, tombol Approve / Reject + alasan.
        </Typography>
      </Paper>
    </Box>
  );
}