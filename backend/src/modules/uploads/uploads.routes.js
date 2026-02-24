// src/modules/uploads/uploads.routes.js
const router = require("express").Router();
const { authJwt } = require("../../middlewares/authJwt");
const { upload } = require("./upload.middleware");
const ctrl = require("./uploads.controller");
const { requireUuidParam } = require("../../middlewares/validateParams");

router.use(authJwt);

// Upload file dataset
router.post(
  "/:dataset_id/file",
  requireUuidParam("dataset_id"),
  upload.single("file"),
  ctrl.uploadDatasetFile
);

// List file uploads per dataset + filter tanggal + pagination
// GET /uploads/:dataset_id/files?date=ALL|YYYY-MM-DD&page=1&limit=10
router.get(
  "/:dataset_id/files",
  requireUuidParam("dataset_id"),
  ctrl.listDatasetFiles
);

// Download file by file_id
router.get(
  "/file/:file_id/download",
  requireUuidParam("file_id"),
  ctrl.downloadDatasetFile
);

module.exports = router;