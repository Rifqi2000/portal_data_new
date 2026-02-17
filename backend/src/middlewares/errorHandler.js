// src/middlewares/errorHandler.js
const { fail } = require("../utils/response");
const { mapDbError } = require("../utils/dbErrorMap");

function errorHandler(err, req, res, next) {
  const mapped = mapDbError(err);

  console.error("❌ ERROR:", {
    message: err.message,
    code: err.code,
    constraint: err.constraint,
    stack: err.stack,
  });

  const isDev = process.env.NODE_ENV !== "production";

  return fail(
    res,
    mapped.status,
    mapped.code,
    mapped.message,
    isDev ? { db: err.message, pgCode: err.code, constraint: err.constraint } : undefined
  );
}

module.exports = { errorHandler };
