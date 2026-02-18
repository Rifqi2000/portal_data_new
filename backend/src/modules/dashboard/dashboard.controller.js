// src/modules/dashboard/dashboard.controller.js
const { ok } = require("../../utils/response");
const svc = require("./dashboard.service");
const { runWithContext } = require("../../db/runWithContext");

async function summary(req, res, next) {
  try {
    const data = await runWithContext(req.app.locals.pool, req.user, "DASHBOARD_SUMMARY", async (db) => {
      return svc.getSummary(db, req.query);
    });
    return ok(res, data, "OK");
  } catch (e) {
    return next(e);
  }
}

async function schedule(req, res, next) {
  try {
    const data = await runWithContext(req.app.locals.pool, req.user, "DASHBOARD_SCHEDULE", async (db) => {
      return svc.getSchedule(db, req.query);
    });
    return ok(res, data, "OK");
  } catch (e) {
    return next(e);
  }
}

async function charts(req, res, next) {
  try {
    const data = await runWithContext(req.app.locals.pool, req.user, "DASHBOARD_CHARTS", async (db) => {
      return svc.getCharts(db, req.query);
    });
    return ok(res, data, "OK");
  } catch (e) {
    return next(e);
  }
}

module.exports = { summary, schedule, charts };
