// src/utils/dbErrorMap.js

/**
 * Map database/application error -> HTTP status + API error code
 * Fokus: PostgreSQL + trigger/RLS workflow Portal Data New
 */
function mapDbError(err) {
  const pgCode = err?.code;                 // Postgres error code (contoh: 23505)
  const msg = String(err?.message || "");
  const msgLower = msg.toLowerCase();

  // =========================
  // 0) Custom errors from DB trigger/function
  // biasanya pakai: RAISE EXCEPTION '...' USING ERRCODE='P0001';
  // =========================
  if (pgCode === "P0001") {
    // AUTH / RLS / ROLE
    if (msgLower.includes("only bidang")) {
      return { status: 403, code: "AUTH_FORBIDDEN", message: msg };
    }
    if (msgLower.includes("only kabid") || msgLower.includes("kepala bidang")) {
      return { status: 403, code: "AUTH_FORBIDDEN", message: msg };
    }
    if (msgLower.includes("only pusdatin")) {
      return { status: 403, code: "AUTH_FORBIDDEN", message: msg };
    }

    // Workflow / status
    if (msgLower.includes("dataset is locked") || msgLower.includes("status") && msgLower.includes("draft")) {
      return { status: 409, code: "DATASET_STATUS_INVALID", message: msg };
    }
    if (msgLower.includes("transition not allowed") || msgLower.includes("not allowed")) {
      return { status: 409, code: "DATASET_TRANSITION_NOT_ALLOWED", message: msg };
    }

    // Reason required
    if (msgLower.includes("reason is required") || msgLower.includes("alasan")) {
      return { status: 400, code: "REASON_REQUIRED", message: msg };
    }

    // Not found (kalau trigger/function kamu raise ini)
    if (msgLower.includes("not found")) {
      return { status: 404, code: "NOT_FOUND", message: msg };
    }

    // Default P0001 → anggap business rule violation
    return { status: 400, code: "BUSINESS_RULE_VIOLATION", message: msg };
  }

  // =========================
  // 1) PostgreSQL permission / RLS
  // =========================
  // 42501 = insufficient_privilege
  if (pgCode === "42501") {
    return { status: 403, code: "AUTH_FORBIDDEN", message: "Forbidden." };
  }

  // =========================
  // 2) Data integrity constraints
  // =========================
  // 23505 = unique_violation
  if (pgCode === "23505") {
    // kalau mau lebih spesifik berdasarkan constraint name:
    // err.constraint bisa ada
    const constraint = err?.constraint || "";
    if (constraint.toLowerCase().includes("unique")) {
      return { status: 409, code: "DUPLICATE_CONFLICT", message: "Duplicate data." };
    }
    return { status: 409, code: "DUPLICATE_CONFLICT", message: "Duplicate conflict." };
  }

  // 23503 = foreign_key_violation
  if (pgCode === "23503") {
    return { status: 409, code: "FK_CONFLICT", message: "Cannot delete/update due to related data." };
  }

  // 23502 = not_null_violation
  if (pgCode === "23502") {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: `Missing required field: ${err?.column || "unknown"}.`,
    };
  }

  // 23514 = check_violation
  if (pgCode === "23514") {
    return { status: 400, code: "VALIDATION_ERROR", message: "Invalid value (check constraint failed)." };
  }

  // =========================
  // 3) Invalid input / type cast errors
  // =========================
  // 22P02 = invalid_text_representation (contoh: uuid invalid)
  if (pgCode === "22P02") {
    return { status: 400, code: "INVALID_FORMAT", message: "Invalid input format." };
  }

  // 22001 = string_data_right_truncation
  if (pgCode === "22001") {
    return { status: 400, code: "VALUE_TOO_LONG", message: "Value too long." };
  }

  // =========================
  // 4) Connection / timeout / misc db errors
  // =========================
  // 57P01 = admin_shutdown, 57P02 = crash_shutdown, 53300 = too_many_connections
  if (pgCode === "53300") {
    return { status: 503, code: "DB_BUSY", message: "Database is busy. Try again later." };
  }

  // =========================
  // 5) Application-side errors (non-Postgres)
  // =========================
  if (msgLower.includes("cors not allowed")) {
    return { status: 403, code: "CORS_FORBIDDEN", message: "CORS not allowed." };
  }

  if (msgLower.includes("file type not allowed")) {
    return { status: 400, code: "FILE_TYPE_NOT_ALLOWED", message: "File type not allowed." };
  }

  if (msgLower.includes("header mismatch")) {
    return { status: 400, code: "HEADER_MISMATCH", message: msg };
  }

  if (msgLower.includes("dataset not found")) {
    return { status: 404, code: "DATASET_NOT_FOUND", message: "Dataset not found." };
  }

  // =========================
  // 6) Default fallback
  // =========================
  return { status: 500, code: "INTERNAL_ERROR", message: "Internal server error." };
}

module.exports = { mapDbError };
