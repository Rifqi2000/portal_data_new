// src/db/runWithContext.js
async function runWithContext(pool, user, reason, fn) {
  if (!user?.user_id || !user?.role) {
    const err = new Error("Missing session context (user_id/role).");
    err.code = "P0001";
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`SELECT set_config('app.user_id', $1, true)`, [String(user.user_id)]);
    await client.query(`SELECT set_config('app.role', $1, true)`, [String(user.role)]);

    // bidang_id: pakai "0" biar aman kalau policy melakukan ::int
    await client.query(`SELECT set_config('app.bidang_id', $1, true)`, [
      user.bidang_id ? String(user.bidang_id) : "0",
    ]);

    await client.query(`SELECT set_config('app.reason', $1, true)`, [
      reason ? String(reason) : "",
    ]);

    const result = await fn(client);

    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runWithContext };
