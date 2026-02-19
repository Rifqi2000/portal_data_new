// src/middlewares/authJwt.js
const jwt = require("jsonwebtoken");
const { fail } = require("../utils/response");

function authJwt(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return fail(res, 401, "AUTH_TOKEN_MISSING", "Token missing");

  try {
    // PENTING: verify access token pakai JWT_ACCESS_SECRET
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload; // { user_id, role, bidang_id, username }
    return next();
  } catch (e) {
    return fail(res, 401, "AUTH_TOKEN_INVALID", "Token invalid");
  }
}

module.exports = { authJwt };
