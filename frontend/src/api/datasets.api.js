import http from "./http";

export const datasetsApi = {
  list: (params) => http.get("/datasets", { params }),
  detail: (id) => http.get(`/datasets/${id}`),
  preview: (id, params) => http.get(`/datasets/${id}/preview`, { params }),
  templateCsv: (id) => http.get(`/datasets/${id}/template.csv`, { responseType: "blob" }),
};
