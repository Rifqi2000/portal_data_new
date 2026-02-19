// src/modules/auth/auth.controller.js
const { ok } = require("../../utils/response");
const { loginService, refreshService, logoutService } = require("./auth.service");

async function login(req, res, next) {
  try {
    const data = await loginService(req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return ok(res, data, "Login success");
  } catch (err) {
    return next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const data = await refreshService(req.body, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    return ok(res, data, "Refresh success");
  } catch (err) {
    return next(err);
  }
}

/**
 * LOGOUT (protected)
 * - ambil user dari req.user (hasil authJwt)
 * - ambil refresh_token & all_devices dari body
 */
async function logout(req, res, next) {
  try {
    const refreshToken = req.body?.refresh_token || null;
    const allDevices = !!req.body?.all_devices;

    // req.user berasal dari authJwt middleware
    const data = await logoutService(req.user, refreshToken, allDevices);

    return ok(res, data, "Logout success");
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  return ok(res, req.user, "OK");
}

module.exports = { login, refresh, logout, me };
