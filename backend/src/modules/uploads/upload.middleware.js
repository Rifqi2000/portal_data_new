// src/modules/uploads/upload.middleware.js
const path = require("path");
const fs = require("fs");
const multer = require("multer");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeOriginalName(name) {
  return String(name || "file")
    .replace(/[^\w.\- ]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const datasetId = req.params.dataset_id;
    const dir = path.join(process.cwd(), "uploads", "datasets", datasetId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = sanitizeOriginalName(file.originalname);
    cb(null, `${ts}_${safe}`);
  },
});

// ✅ Perluas mimetype agar non-terstruktur bisa lebih bebas
// (terstruktur tetap divalidasi lagi di uploads.service.js)
const allowed = new Set([
  // structured
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // docs
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // images
  "image/png",
  "image/jpeg",
  "image/webp",

  // archives
  "application/zip",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
]);

function fileFilter(req, file, cb) {
  // kalau mimetype tidak dikenali, tolak
  if (!file?.mimetype) {
    return cb(new Error("File mimetype tidak terbaca."), false);
  }

  if (!allowed.has(file.mimetype)) {
    return cb(new Error("File type not allowed."), false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
});

module.exports = { upload };