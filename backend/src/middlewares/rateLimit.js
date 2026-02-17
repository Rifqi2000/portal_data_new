const rateLimit = require("express-rate-limit");

// Limit umum (untuk semua API)
const limiter = rateLimit({
  windowMs: 60 * 1000,          // 1 menit
  max: 300,                     // max 300 request / menit / IP (sesuaikan)
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit ketat untuk login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 menit
  max: 10,                      // max 10 kali login / 15 menit / IP
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_LOGIN",
      message: "Too many login attempts. Please try again later.",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { limiter, loginLimiter };
