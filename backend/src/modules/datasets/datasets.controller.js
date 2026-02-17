const { ok } = require("../../utils/response");
const { pool } = require("../../config/db");
const { runWithContext } = require("../../db/runWithContext");
const svc = require("./datasets.service");

async function listDatasets(req, res, next) {
  try {
    const data = await runWithContext(pool, req.user, null, (db) => svc.list(db, req.query));
    return ok(res, data);
  } catch (e) { next(e); }
}

async function getDataset(req, res, next) {
  try {
    const data = await runWithContext(pool, req.user, null, (db) => svc.detail(db, req.params.dataset_id));
    return ok(res, data);
  } catch (e) { next(e); }
}

// NEW: preview records
async function previewDataset(req, res, next) {
  try {
    const { dataset_id } = req.params;
    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.preview(db, dataset_id, req.query)
    );
    return ok(res, data, "Preview dataset");
  } catch (e) { next(e); }
}

// NEW: download template CSV
async function downloadTemplateCsv(req, res, next) {
  try {
    const { dataset_id } = req.params;

    const csv = await runWithContext(pool, req.user, null, (db) =>
      svc.buildTemplateCsv(db, dataset_id)
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="template_${dataset_id}.csv"`);
    return res.status(200).send(csv);
  } catch (e) { next(e); }
}

async function submitDataset(req, res, next) {
  try {
    const data = await runWithContext(pool, req.user, null, (db) => svc.submit(db, req.params.dataset_id));
    return ok(res, data, "Submitted to Kepala Bidang");
  } catch (e) { next(e); }
}

async function reviseDataset(req, res, next) {
  try {
    const data = await runWithContext(pool, req.user, null, (db) => svc.revise(db, req.params.dataset_id));
    return ok(res, data, "Back to DRAFT");
  } catch (e) { next(e); }
}

module.exports = {
  listDatasets,
  getDataset,
  previewDataset,
  downloadTemplateCsv,
  submitDataset,
  reviseDataset,
};
