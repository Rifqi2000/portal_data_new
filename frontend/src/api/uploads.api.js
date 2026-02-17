import http from "./http";

export const uploadsApi = {
  uploadDatasetFile: (datasetId, file) => {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/uploads/${datasetId}/file`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
