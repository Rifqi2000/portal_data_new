require("dotenv").config();
const { createApp } = require("./app");
const { pool } = require("./config/db");

const app = createApp();
app.locals.pool = pool;
const port = process.env.PORT || 5000;

app.listen(port, () => console.log(`API running on :${port}`));
