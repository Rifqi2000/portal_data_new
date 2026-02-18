// src/modules/dashboard/dashboard.routes.js
const router = require("express").Router();
const { authJwt } = require("../../middlewares/authJwt");
const ctrl = require("./dashboard.controller");

router.use(authJwt);

router.get("/summary", ctrl.summary);
router.get("/schedule", ctrl.schedule);
router.get("/charts", ctrl.charts);

module.exports = router;
