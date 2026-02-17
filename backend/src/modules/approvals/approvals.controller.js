const { ok } = require("../../utils/response");
const { pool } = require("../../config/db");
const { runWithContext } = require("../../db/runWithContext");
const svc = require("./approvals.service");

// ===== LIST QUEUE =====
async function listKabidQueue(req, res, next) {
  try {
    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.listQueueKabid(db, req.query)
    );
    return ok(res, data, "Approval queue Kabid");
  } catch (err) {
    return next(err);
  }
}

async function listPusdatinQueue(req, res, next) {
  try {
    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.listQueuePusdatin(db, req.query)
    );
    return ok(res, data, "Approval queue Pusdatin");
  } catch (err) {
    return next(err);
  }
}

// ===== ACTIONS =====
async function approveKabid(req, res, next) {
  try {
    const { dataset_id } = req.params;
    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.approveKabid(db, dataset_id)
    );
    return ok(res, data, "Approved by Kepala Bidang");
  } catch (err) {
    return next(err);
  }
}

async function rejectKabid(req, res, next) {
  try {
    const { dataset_id } = req.params;
    const { reason } = req.body || {};
    const data = await runWithContext(pool, req.user, reason, (db) =>
      svc.rejectKabid(db, dataset_id, reason)
    );
    return ok(res, data, "Rejected by Kepala Bidang");
  } catch (err) {
    return next(err);
  }
}

async function verifyPusdatin(req, res, next) {
  try {
    const { dataset_id } = req.params;
    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.verifyPusdatin(db, dataset_id)
    );
    return ok(res, data, "Verified final by Pusdatin");
  } catch (err) {
    return next(err);
  }
}

async function rejectPusdatin(req, res, next) {
  try {
    const { dataset_id } = req.params;
    const { reason } = req.body || {};
    const data = await runWithContext(pool, req.user, reason, (db) =>
      svc.rejectPusdatin(db, dataset_id, reason)
    );
    return ok(res, data, "Rejected by Pusdatin");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listKabidQueue,
  listPusdatinQueue,
  approveKabid,
  rejectKabid,
  verifyPusdatin,
  rejectPusdatin,
};
