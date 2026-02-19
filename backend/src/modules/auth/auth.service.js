// src/modules/auth/auth.service.js
const bcrypt = require("bcrypt");
const { pool } = require("../../config/db");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require("../../utils/tokens");

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * LOGIN
 * - cek username/password
 * - issue access token (short)
 * - issue refresh token (long)
 * - simpan hash refresh token ke DB
 */
async function loginService(payload, meta = {}) {
  const username = (payload?.username || "").trim();
  const password = String(payload?.password || "");

  if (!username || !password) {
    const err = new Error("Username and password are required.");
    err.code = "P0001";
    throw err;
  }

  const q = `
    SELECT
      u.user_id, u.bidang_id, u.username, u.email,
      u.password_hash, u.is_active,
      r.role_name
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id
    WHERE u.username = $1
    LIMIT 1
  `;
  const row = (await pool.query(q, [username])).rows[0];

  if (!row) {
    const err = new Error("Invalid username or password.");
    err.code = "P0001";
    throw err;
  }
  if (row.is_active === false) {
    const err = new Error("User is inactive.");
    err.code = "P0001";
    throw err;
  }

  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) {
    const err = new Error("Invalid username or password.");
    err.code = "P0001";
    throw err;
  }

  const basePayload = {
    user_id: row.user_id,
    username: row.username,
    role: row.role_name,
    bidang_id: row.bidang_id ?? null,
  };

  const accessToken = signAccessToken(basePayload);

  const refreshToken = signRefreshToken({
    ...basePayload,
    typ: "refresh",
  });

  const refreshHash = hashToken(refreshToken);

  // MVP: 7 hari (samakan dengan JWT_REFRESH_EXPIRES_IN yang kamu pakai)
  const expiresAt = addDays(new Date(), 7);

  await pool.query(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_ip, user_agent)
    VALUES ($1::uuid, $2::text, $3::timestamptz, $4::inet, $5::text)
    `,
    [row.user_id, refreshHash, expiresAt, meta.ip || null, meta.userAgent || null]
  );

  await pool.query(`UPDATE users SET last_login = NOW() WHERE user_id = $1::uuid`, [
    row.user_id,
  ]);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      user_id: row.user_id,
      bidang_id: row.bidang_id ?? null,
      username: row.username,
      email: row.email,
      role: row.role_name,
    },
  };
}

/**
 * REFRESH (ROTATE)
 * Controller memanggil: refreshService(req.body, meta)
 * Body bentuknya: { refresh_token: "..." }
 */
async function refreshService(body, meta = {}) {
  const refreshToken = body?.refresh_token;

  if (!refreshToken) {
    const err = new Error("refresh_token is required.");
    err.code = "P0001";
    throw err;
  }

  // 1) Verify refresh token signature
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (e) {
    const err = new Error("Invalid refresh token.");
    err.code = "P0001";
    throw err;
  }

  // opsional tapi bagus: pastikan memang refresh token
  if (payload?.typ !== "refresh") {
    const err = new Error("Invalid refresh token type.");
    err.code = "P0001";
    throw err;
  }

  const refreshHash = hashToken(refreshToken);

  // 2) Cari token lama di DB
  const old = (
    await pool.query(
      `
      SELECT refresh_token_id, user_id, expires_at, revoked_at
      FROM refresh_tokens
      WHERE token_hash = $1
      LIMIT 1
      `,
      [refreshHash]
    )
  ).rows[0];

  if (!old) {
    const err = new Error("Refresh token not found (already revoked or invalid).");
    err.code = "P0001";
    throw err;
  }

  if (old.revoked_at) {
    const err = new Error("Refresh token already revoked.");
    err.code = "P0001";
    throw err;
  }

  if (new Date(old.expires_at) < new Date()) {
    const err = new Error("Refresh token expired.");
    err.code = "P0001";
    throw err;
  }

  // pastikan token milik user yang sama
  if (String(old.user_id) !== String(payload.user_id)) {
    const err = new Error("Refresh token does not match user.");
    err.code = "P0001";
    throw err;
  }

  // 3) Issue new tokens
  const basePayload = {
    user_id: payload.user_id,
    username: payload.username,
    role: payload.role,
    bidang_id: payload.bidang_id ?? null,
  };

  const newAccessToken = signAccessToken(basePayload);

  const newRefreshToken = signRefreshToken({
    ...basePayload,
    typ: "refresh",
  });

  const newHash = hashToken(newRefreshToken);
  const expiresAt = addDays(new Date(), 7);

  // 4) Rotate token dalam transaction
  await pool.query("BEGIN");
  try {
    const inserted = (
      await pool.query(
        `
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_ip, user_agent)
        VALUES ($1::uuid, $2::text, $3::timestamptz, $4::inet, $5::text)
        RETURNING refresh_token_id
        `,
        [payload.user_id, newHash, expiresAt, meta.ip || null, meta.userAgent || null]
      )
    ).rows[0];

    await pool.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = now(), replaced_by = $2::uuid
      WHERE refresh_token_id = $1::uuid
        AND revoked_at IS NULL
      `,
      [old.refresh_token_id, inserted.refresh_token_id]
    );

    await pool.query("COMMIT");
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  }

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
  };
}

/**
 * LOGOUT (protected)
 * Controller memanggil: logoutService(req.user, refreshToken, allDevices)
 *
 * - update last_logout
 * - revoke refresh token (device ini) atau semua device
 */
async function logoutService(user, refreshToken, allDevices = false) {
  if (!user?.user_id) {
    const err = new Error("Invalid session.");
    err.code = "P0001";
    throw err;
  }

  await pool.query(`UPDATE users SET last_logout = NOW() WHERE user_id = $1::uuid`, [
    user.user_id,
  ]);

  // revoke semua device
  if (allDevices) {
    await pool.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE user_id = $1::uuid
        AND revoked_at IS NULL
      `,
      [user.user_id]
    );
    return { revoked: "ALL_DEVICES" };
  }

  // revoke device ini (butuh refresh_token)
  if (!refreshToken) {
    const err = new Error(
      "refresh_token is required for single-device logout (or set all_devices=true)."
    );
    err.code = "P0001";
    throw err;
  }

  const h = hashToken(refreshToken);

  const r = await pool.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = now()
    WHERE user_id = $1::uuid
      AND token_hash = $2::text
      AND revoked_at IS NULL
    `,
    [user.user_id, h]
  );

  if (r.rowCount === 0) {
    return { revoked: "NOT_FOUND_OR_ALREADY_REVOKED" };
  }

  return { revoked: "CURRENT_DEVICE" };
}

module.exports = {
  loginService,
  refreshService,
  logoutService,
};
