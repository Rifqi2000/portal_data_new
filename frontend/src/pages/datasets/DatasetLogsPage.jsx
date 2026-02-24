import { Box, Paper, Typography } from "@mui/material";
import { useParams } from "react-router-dom";

export default function DatasetLogsPage() {
  const { datasetId } = useParams();
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Pelacakan Data
        </Typography>
        <Typography color="text.secondary">
          Dataset ID: {datasetId}
        </Typography>
        <Typography sx={{ mt: 2 }}>
          (Placeholder) Nanti: tampil log aktivitas dataset (create, edit, upload, approve, reject, dll).
        </Typography>
      </Paper>
    </Box>
  );
}