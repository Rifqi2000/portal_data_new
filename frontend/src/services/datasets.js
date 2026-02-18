import { api } from "./api";

export async function fetchDatasets(params) {
  // params: { q, status, periode_data, page, limit }
  const res = await api.get("/datasets", { params });
  return res.data; // sesuaikan dgn response backend kamu
}
