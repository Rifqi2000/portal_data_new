// src/modules/uploads/uploads.controller.js
const fs = require("fs");
const path = require("path");

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
      err.status = 400;
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

/**
 * GET /uploads/:dataset_id/files?date=&page=&limit=
 */
async function listDatasetFiles(req, res, next) {
  try {
    const { dataset_id } = req.params;

    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.listFiles(db, {
        datasetId: dataset_id,
        query: req.query,
      })
    );

    return ok(res, data, "OK");
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /uploads/file/:file_id/download
 */
async function downloadDatasetFile(req, res, next) {
  try {
    const { file_id } = req.params;

    const fileRow = await runWithContext(pool, req.user, null, (db) =>
      svc.getFileById(db, { fileId: file_id })
    );

    if (!fileRow) {
      const err = new Error("File not found.");
      err.code = "P0001";
      err.status = 404;
      throw err;
    }

    // schema kamu: storage_path
    const filePath = fileRow.storage_path;
    if (!filePath || !fs.existsSync(filePath)) {
      const err = new Error("File missing on storage.");
      err.code = "P0001";
      err.status = 404;
      throw err;
    }

    // ✅ tabel kamu tidak punya mime_type, jadi jangan pakai fileRow.mime_type
    // kalau mau, set berdasarkan extension/file_type
    const ext = String(fileRow.file_type || "").toLowerCase();
    const contentType =
      ext === ".csv"
        ? "text/csv"
        : ext === ".xlsx" || ext === ".xls"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/octet-stream";

    res.setHeader("Content-Type", contentType);

    const downloadName = fileRow.file_name || path.basename(filePath);
    return res.download(filePath, downloadName);
  } catch (err) {
    return next(err);
  }
}

/**
 * ✅ NEW: GET /uploads/file/:file_id/preview?limit=&offset=
 * Preview isi file langsung dari storage_path (sinkron dengan hasil unduhan).
 */
async function previewFile(req, res, next) {
  try {
    const { file_id } = req.params;

    const limit = Number(req.query?.limit ?? 10);
    const offset = Number(req.query?.offset ?? 0);

    const data = await runWithContext(pool, req.user, null, (db) =>
      svc.previewFileById(db, { fileId: file_id, limit, offset })
    );

    return ok(res, data, "OK");
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  uploadDatasetFile,
  listDatasetFiles,
  downloadDatasetFile,
  previewFile,
};