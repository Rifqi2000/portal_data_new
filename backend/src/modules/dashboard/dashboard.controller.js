// src/modules/dashboard/dashboard.controller.js
const { ok } = require("../../utils/response");
const svc = require("./dashboard.service");
const { runWithContext } = require("../../db/runWithContext");

/**
 * GET /dashboard/summary?year=&month=
 */
async function summary(req, res, next) {
  try {
    const data = await runWithContext(
      req.app.locals.pool,
      req.user,
      "DASHBOARD_SUMMARY",
      async (db) => {
        // ✅ PASS req.user agar RBAC bisa diterapkan di service
        return svc.getSummary(db, req.query, req.user);
      }
    );

    return ok(res, data, "Dashboard summary");
  } catch (e) {
    return next(e);
  }
}

/**
 * GET /dashboard/schedule?year=&month=&page=&limit=
 */
async function schedule(req, res, next) {
  try {
    const data = await runWithContext(
      req.app.locals.pool,
      req.user,
      "DASHBOARD_SCHEDULE",
      async (db) => {
        // ✅ PASS req.user
        return svc.getSchedule(db, req.query, req.user);
      }
    );

    return ok(res, data, "Dashboard schedule");
  } catch (e) {
    return next(e);
  }
}

/**
 * GET /dashboard/charts?year=
 */
async function charts(req, res, next) {
  try {
    const data = await runWithContext(
      req.app.locals.pool,
      req.user,
      "DASHBOARD_CHARTS",
      async (db) => {
        // ✅ PASS req.user
        return svc.getCharts(db, req.query, req.user);
      }
    );

    return ok(res, data, "Dashboard charts");
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  summary,
  schedule,
  charts,
};