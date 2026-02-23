// src/middlewares/authJwt.js
const jwt = require("jsonwebtoken");
const { fail } = require("../utils/response");

/**
 * authJwt
 * - Expect: Authorization: Bearer <access_token>
 * - Token payload minimal harus mengandung:
 *   - user_id (uuid)
 *   - role (string)
 *   - bidang_id (int) (opsional tapi dianjurkan)
 *
 * Output:
 *   req.user = { user_id, role, bidang_id, username }
 */
function authJwt(req, res, next) {
  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return fail(res, 401, "AUTH_TOKEN_MISSING", "Token missing");
  }

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    // server misconfig
    return fail(res, 500, "AUTH_SERVER_MISCONFIG", "JWT_ACCESS_SECRET is not set");
  }

  try {
    const payload = jwt.verify(token, secret);

    // dukung beberapa kemungkinan key dari payload
    const user_id =
      payload.user_id ||
      payload.userId ||
      payload.sub || // kadang token taruh user_id di "sub"
      null;

    const role = payload.role ? String(payload.role).trim().toUpperCase() : "";

    // bidang_id (int) - kalau tidak ada biarkan null (runWithContext akan set "0")
    let bidang_id = payload.bidang_id ?? payload.bidangId ?? null;
    if (bidang_id !== null && bidang_id !== undefined && bidang_id !== "") {
      const n = Number(bidang_id);
      bidang_id = Number.isFinite(n) ? n : null;
    } else {
      bidang_id = null;
    }

    const username = payload.username ? String(payload.username).trim() : "";

    // validasi minimal agar runWithContext aman
    if (!user_id || !role) {
      return fail(res, 401, "AUTH_TOKEN_INVALID", "Token payload incomplete");
    }

    req.user = {
      user_id: String(user_id),
      role,
      bidang_id, // number|null
      username,
    };

    return next();
  } catch (e) {
    return fail(res, 401, "AUTH_TOKEN_INVALID", "Token invalid");
  }
}

module.exports = { authJwt };