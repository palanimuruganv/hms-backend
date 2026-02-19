const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = path.join(process.env.UPLOAD_PATH || "./uploads", req.uploadFolder || "general");
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
  if (allowed.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
  cb(new Error("Only images, PDFs and documents are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

// Helper middlewares for different upload contexts
exports.uploadSingle = (fieldName, folder = "general") => (req, res, next) => {
  req.uploadFolder = folder;
  upload.single(fieldName)(req, res, next);
};

exports.uploadMultiple = (fieldName, max = 5, folder = "general") => (req, res, next) => {
  req.uploadFolder = folder;
  upload.array(fieldName, max)(req, res, next);
};
