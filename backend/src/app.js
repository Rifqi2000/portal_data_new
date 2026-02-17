const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { errorHandler } = require("./middlewares/errorHandler");
const { limiter } = require("./middlewares/rateLimit");

const authRoutes = require("./modules/auth/auth.routes");
const datasetRoutes = require("./modules/datasets/datasets.routes");
const approvalRoutes = require("./modules/approvals/approvals.routes");
const uploadRoutes = require("./modules/uploads/uploads.routes");

function createApp() {
  const app = express();

  // ==============================
  // Security Headers
  // ==============================
  app.use(helmet());

  // ==============================
  // CORS WHITELIST
  // ==============================
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    // Tambahkan domain production nanti:
    // "https://portal-data.dprkp.go.id"
  ];

  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow non-browser requests (Postman, curl, server-to-server)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("CORS not allowed for this origin."), false);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  // ==============================
  // Logger
  // ==============================
  app.use(morgan("dev"));

  // ==============================
  // Body parser
  // ==============================
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ==============================
  // Global Rate Limit
  // ==============================
  app.use(limiter);

  // ==============================
  // Health Check
  // ==============================
  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // ==============================
  // Routes
  // ==============================
  app.use("/api/auth", authRoutes);
  app.use("/api/datasets", datasetRoutes);
  app.use("/api/approvals", approvalRoutes);
  app.use("/api/uploads", uploadRoutes);

  // ==============================
  // Error Handler
  // ==============================
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
