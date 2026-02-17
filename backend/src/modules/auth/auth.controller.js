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

async function logout(req, res, next) {
  try {
    const data = await logoutService(req.body);
    return ok(res, data, "Logout success");
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  return ok(res, req.user, "OK");
}

module.exports = { login, refresh, logout, me };
