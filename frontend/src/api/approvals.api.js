import http from "./http";

export const approvalsApi = {
  listKabid: () => http.get("/approvals/kabid"),
  approveKabid: (id) => http.post(`/approvals/kabid/${id}/approve`),
  rejectKabid: (id, payload) => http.post(`/approvals/kabid/${id}/reject`, payload),

  listPusdatin: () => http.get("/approvals/pusdatin"),
  verifyPusdatin: (id) => http.post(`/approvals/pusdatin/${id}/verify`),
  rejectPusdatin: (id, payload) => http.post(`/approvals/pusdatin/${id}/reject`, payload),
};
