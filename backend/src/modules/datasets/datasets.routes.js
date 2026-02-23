// src/modules/datasets/datasets.routes.js
const router = require("express").Router();
const { authJwt } = require("../../middlewares/authJwt");
const ctrl = require("./datasets.controller");

// semua endpoint dataset wajib login
router.use(authJwt);

/**
 * CREATE (FE)
 */
router.post("/check-name", ctrl.checkName);
router.post("/", ctrl.createDataset);

/**
 * LIST & DETAIL
 */
router.get("/", ctrl.listDatasets);
router.get("/:dataset_id", ctrl.getDataset);

/**
 * EXTRA (TERSTRUKTUR ONLY)
 */
router.get("/:dataset_id/preview", ctrl.previewDataset);
router.get("/:dataset_id/template.csv", ctrl.downloadTemplateCsv);

/**
 * WORKFLOW
 */
router.post("/:dataset_id/submit", ctrl.submitDataset);
router.post("/:dataset_id/revise", ctrl.reviseDataset);

router.post("/:dataset_id/approve-kabid", ctrl.approveKabid);
router.post("/:dataset_id/reject-kabid", ctrl.rejectKabid);

router.post("/:dataset_id/verify-pusdatin", ctrl.verifyPusdatin);
router.post("/:dataset_id/reject-pusdatin", ctrl.rejectPusdatin);

module.exports = router;