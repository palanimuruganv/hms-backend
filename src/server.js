
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");
const swaggerSpec = require("./config/swagger");
const { errorHandler } = require("./middlewares/errorHandler");
const authRoutes = require("./routes/authRoutes");
const {
  patientRouter, opdRouter, ipdRouter, emergencyRouter,
  bedRouter, pharmacyRouter, labRouter, billingRouter,
  doctorRouter, staffRouter, appointmentRouter, dashboardRouter,
} = require("./routes/index");

// ── Connect DB ────────────────────────────────────────────────
connectDB();

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
}));
app.use(mongoSanitize());

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// ── Rate Limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  message: { success: false, message: "Too many requests. Try again later." },
});
app.use("/api/", limiter);
app.use("/api/v1/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// ── Static Files ──────────────────────────────────────────────
const uploadPath = process.env.UPLOAD_PATH || "./uploads";
fs.mkdirSync(uploadPath, { recursive: true });
app.use("/uploads", express.static(path.resolve(uploadPath)));

// ── API Routes ────────────────────────────────────────────────
const API = "/api/v1";
app.use(`${API}/auth`,         authRoutes);
app.use(`${API}/patients`,     patientRouter);
app.use(`${API}/opd`,          opdRouter);
app.use(`${API}/ipd`,          ipdRouter);
app.use(`${API}/emergency`,    emergencyRouter);
app.use(`${API}/beds`,         bedRouter);
app.use(`${API}/pharmacy`,     pharmacyRouter);
app.use(`${API}/lab`,          labRouter);
app.use(`${API}/billing`,      billingRouter);
app.use(`${API}/doctors`,      doctorRouter);
app.use(`${API}/staff`,        staffRouter);
app.use(`${API}/appointments`, appointmentRouter);
app.use(`${API}/dashboard`,    dashboardRouter);

// ── Swagger Docs ──────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "🏥 Hospital Management API",
  swaggerOptions: { persistAuthorization: true },
}));

// ── Health Check ──────────────────────────────────────────────
app.get("/health", (req, res) => res.json({
  status: "OK",
  timestamp: new Date().toISOString(),
  uptime: `${Math.floor(process.uptime())}s`,
  environment: process.env.NODE_ENV,
  modules: ["Auth", "OPD", "IPD", "Emergency", "Beds", "Pharmacy", "Lab", "Billing", "Doctors", "Staff", "Appointments", "Dashboard"],
}));

// ── 404 ───────────────────────────────────────────────────────
app.use("*", (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` }));

// ── Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║      🏥 Hospital Management System API        ║
╠═══════════════════════════════════════════════╣
║  🚀 Port    : ${PORT}                              ║
║  🌍 Mode    : ${(process.env.NODE_ENV || "development").padEnd(12)}                  ║
║  📚 Docs    : http://localhost:${PORT}/api-docs    ║
║  💚 Health  : http://localhost:${PORT}/health      ║
╠═══════════════════════════════════════════════╣
║  Modules: OPD · IPD · Emergency · Beds        ║
║           Pharmacy · Lab · Billing            ║
║           Doctors · Staff · Appointments      ║
╚═══════════════════════════════════════════════╝
  `);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  server.close(() => process.exit(1));
});

module.exports = app;
