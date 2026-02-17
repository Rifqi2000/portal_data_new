const router = require("express").Router();
const { authJwt } = require("../../middlewares/authJwt");
const { upload } = require("./upload.middleware");
const ctrl = require("./uploads.controller");
const { requireUuidParam } = require("../../middlewares/validateParams");

router.use(authJwt);

router.post(
  "/:dataset_id/file",
  requireUuidParam("dataset_id"),
  upload.single("file"),
  ctrl.uploadDatasetFile
);

module.exports = router;
