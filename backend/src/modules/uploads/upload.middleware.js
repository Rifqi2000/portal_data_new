const path = require("path");
const fs = require("fs");
const multer = require("multer");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const datasetId = req.params.dataset_id;
    const dir = path.join(process.cwd(), "uploads", "datasets", datasetId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // contoh: 20260217_170500_originalname.xlsx
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = file.originalname.replace(/[^\w.\- ]/g, "_");
    cb(null, `${ts}_${safe}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!allowed.includes(file.mimetype)) {
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
