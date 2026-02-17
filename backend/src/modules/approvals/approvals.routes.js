const router = require("express").Router();
const { authJwt } = require("../../middlewares/authJwt");
const ctrl = require("./approvals.controller");

router.use(authJwt);

// LIST approval queue
router.get("/kabid", ctrl.listKabidQueue);
router.get("/pusdatin", ctrl.listPusdatinQueue);

// ACTIONS Kabid
router.post("/kabid/:dataset_id/approve", ctrl.approveKabid);
router.post("/kabid/:dataset_id/reject", ctrl.rejectKabid);

// ACTIONS Pusdatin
router.post("/pusdatin/:dataset_id/verify", ctrl.verifyPusdatin);
router.post("/pusdatin/:dataset_id/reject", ctrl.rejectPusdatin);

module.exports = router;
