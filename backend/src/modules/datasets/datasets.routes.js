const router = require("express").Router();
const { authJwt } = require("../../middlewares/authJwt");
const ctrl = require("./datasets.controller");

router.use(authJwt);

router.get("/", ctrl.listDatasets);
router.get("/:dataset_id", ctrl.getDataset);

// NEW:
router.get("/:dataset_id/preview", ctrl.previewDataset);
router.get("/:dataset_id/template.csv", ctrl.downloadTemplateCsv);

router.post("/:dataset_id/submit", ctrl.submitDataset);
router.post("/:dataset_id/revise", ctrl.reviseDataset);

module.exports = router;
