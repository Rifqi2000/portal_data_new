const { ok } = require("../../utils/response");
const { pool } = require("../../config/db");
const { runWithContext } = require("../../db/runWithContext");
const svc = require("./uploads.service");

async function uploadDatasetFile(req, res, next) {
  try {
    const { dataset_id } = req.params;
    const file = req.file;

    if (!file) {
      const err = new Error("File is required.");
      err.code = "P0001";
      throw err;
    }

    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.handleUpload(db, {
        datasetId: dataset_id,
        file,
        actorUserId: req.user.user_id,
      })
    );

    return ok(res, data, "Upload success");
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadDatasetFile };
