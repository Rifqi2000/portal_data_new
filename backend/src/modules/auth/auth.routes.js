// src/modules/auth/auth.routes.js
const router = require("express").Router();
const rateLimit = require("express-rate-limit");

const { login, refresh, logout, me } = require("./auth.controller");
const { authJwt } = require("../../middlewares/authJwt");

// limiter login
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: 20,                  // 20 attempt per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// limiter refresh (opsional tapi direkomendasikan)
const refreshLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60, // refresh lebih sering dari login, jadi limit lebih longgar
  standardHeaders: true,
  legacyHeaders: false,
});

// limiter logout (opsional)
const logoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refresh);

// logout & me protected
router.post("/logout", authJwt, logoutLimiter, logout);
router.get("/me", authJwt, me);

module.exports = router;
