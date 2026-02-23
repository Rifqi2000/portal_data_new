// src/modules/datasets/datasets.controller.js
const { ok } = require("../../utils/response");
const { pool } = require("../../config/db");
const { runWithContext } = require("../../db/runWithContext");
const svc = require("./datasets.service");

// =========================
// Helpers
// =========================
function assertUuid(id, label = "id") {
  const s = String(id || "").trim();
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRe.test(s)) {
    const err = new Error(`${label} must be a valid UUID.`);
    err.code = "P0001";
    throw err;
  }
  return s;
}

function pickReason(body) {
  const b = body || {};
  const reason = String(b.alasan || b.reason || "").trim();
  return reason || null;
}

function requireReason(body) {
  const r = pickReason(body);
  if (!r) {
    const err = new Error("alasan is required.");
    err.code = "P0001";
    throw err;
  }
  return r;
}

// =========================
// Controllers
// =========================

/**
 * GET /datasets
 * Query:
 * - status (optional)
 * - q (optional)
 * - page (optional)
 * - limit (optional)
 *
 * ✅ Penting: pass req.user ke service agar RBAC filter jalan:
 * - BIDANG / KEPALA_BIDANG => hanya bidang sendiri
 * - PUSDATIN / KEPALA_PUSDATIN => semua
 */
async function listDatasets(req, res, next) {
  try {
    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.list(db, req.query, req.user) // ✅ wajib
    );
    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /datasets/:dataset_id
 */
async function getDataset(req, res, next) {
  try {
    const datasetId = assertUuid(req.params.dataset_id, "dataset_id");

    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.detail(db, datasetId)
    );

    return ok(res, data);
  } catch (e) {
    next(e);
  }
}

/**
 * POST /datasets/check-name
 * Body: { nama_dataset } atau { nama_data }
 * Return: { nama_dataset, isAvailable }
 */
async function checkName(req, res, next) {
  try {
    const body = req.body || {};
    const nama = String(body.nama_dataset || body.nama_data || "").trim();

    if (!nama) {
      const err = new Error("nama_dataset is required.");
      err.code = "P0001";
      throw err;
    }

    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.checkName(db, { nama_dataset: nama })
    );

    return ok(res, data, "Check nama dataset");
  } catch (e) {
    next(e);
  }
}

/**
 * POST /datasets
 * Body:
 * {
 *   metadata: {...},
 *   columns: [...]
 * }
 */
async function createDataset(req, res, next) {
  try {
    const payload = req.body || {};

    // runWithContext akan inject session context (user_id/role/bidang_id) ke koneksi db
    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.create(db, payload, req.user)
    );

    return ok(res, data, "Dataset created");
  } catch (e) {
    next(e);
  }
}

/**
 * GET /datasets/:dataset_id/preview
 */
async function previewDataset(req, res, next) {
  try {
    const datasetId = assertUuid(req.params.dataset_id, "dataset_id");

    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.preview(db, datasetId, req.query)
    );

    return ok(res, data, "Preview dataset");
  } catch (e) {
    next(e);
  }
}

/**
 * GET /datasets/:dataset_id/template.csv
 */
async function downloadTemplateCsv(req, res, next) {
  try {
    const datasetId = assertUuid(req.params.dataset_id, "dataset_id");

    const csv = await runWithContext(pool, req.user, null, (db) =>
      svc.buildTemplateCsv(db, datasetId)
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="template_${datasetId}.csv"`
    );

    return res.status(200).send(csv);
  } catch (e) {
    next(e);
  }
}

// =========================
// WORKFLOW: BIDANG
// =========================

/**
 * POST /datasets/:dataset_id/submit
 */
async function submitDataset(req, res, next) {
  try {
    const datasetId = assertUuid(req.params.dataset_id, "dataset_id");

    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.submit(db, datasetId)
    );

    return ok(res, data, "Submitted");
  } catch (e) {
    next(e);
  }
}

/**
 * POST /datasets/:dataset_id/revise
 * Body optional: { alasan } / { reason }
 */
async function reviseDataset(req, res, next) {
  try {
    const datasetId = assertUuid(req.params.dataset_id, "dataset_id");
    const reason = pickReason(req.body);

    // ✅ revise signature = (db, datasetId)
    const data = await runWithContext(pool, req.user, reason, (db) =>
      svc.revise(db, datasetId)
    );

    return ok(res, data, "Back to DRAFT");
  } catch (e) {
    next(e);
  }
}

// =========================
// WORKFLOW: KABID
// =========================

/**
 * POST /datasets/:dataset_id/approve-kabid
 */
async function approveKabid(req, res, next) {
  try {
    const datasetId = assertUuid(req.params.dataset_id, "dataset_id");

    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.approveKabid(db, datasetId)
    );

    return ok(res, data, "Approved by Kepala Bidang");
  } catch (e) {
    next(e);
  }
}

/**
 * POST /datasets/:dataset_id/reject-kabid
 * Body: { alasan } wajib
 */
async function rejectKabid(req, res, next) {
  try {
    const datasetId = assertUuid(req.params.dataset_id, "dataset_id");
    const reason = requireReason(req.body);

    const data = await runWithContext(pool, req.user, reason, (db) =>
      svc.rejectKabid(db, datasetId, reason)
    );

    return ok(res, data, "Rejected by Kepala Bidang");
  } catch (e) {
    next(e);
  }
}

// =========================
// WORKFLOW: PUSDATIN
// =========================

/**
 * POST /datasets/:dataset_id/verify-pusdatin
 */
async function verifyPusdatin(req, res, next) {
  try {
    const datasetId = assertUuid(req.params.dataset_id, "dataset_id");

    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.verifyPusdatin(db, datasetId)
    );

    return ok(res, data, "Verified by Pusdatin");
  } catch (e) {
    next(e);
  }
}

/**
 * POST /datasets/:dataset_id/reject-pusdatin
 * Body: { alasan } wajib
 */
async function rejectPusdatin(req, res, next) {
  try {
    const datasetId = assertUuid(req.params.dataset_id, "dataset_id");
    const reason = requireReason(req.body);

    const data = await runWithContext(pool, req.user, reason, (db) =>
      svc.rejectPusdatin(db, datasetId, reason)
    );

    return ok(res, data, "Rejected by Pusdatin");
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listDatasets,
  getDataset,
  checkName,
  createDataset,
  previewDataset,
  downloadTemplateCsv,
  submitDataset,
  reviseDataset,
  approveKabid,
  rejectKabid,
  verifyPusdatin,
  rejectPusdatin,
};