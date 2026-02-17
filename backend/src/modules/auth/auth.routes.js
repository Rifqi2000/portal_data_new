const router = require("express").Router();
const { login, refresh, logout, me } = require("./auth.controller");
const { authJwt } = require("../../middlewares/authJwt");

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authJwt, me);

module.exports = router;
