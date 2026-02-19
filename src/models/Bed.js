const mongoose = require("mongoose");

const BedSchema = new mongoose.Schema(
  {
    bedNumber: { type: String, required: true, unique: true },
    ward: { type: String, required: true },
    floor: { type: String },
    room: { type: String },
    // ── Type & Features ───────────────────────────
    type: {
      type: String,
      enum: ["general", "private", "semi-private", "icu", "nicu", "picu", "hdu", "emergency", "maternity", "isolation"],
      required: true,
    },
    features: [{ type: String }], // ["oxygen", "suction", "monitor", "ventilator"]
    dailyRate: { type: Number, default: 0 },
    // ── Status ────────────────────────────────────
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "maintenance", "cleaning"],
      default: "available",
    },
    // ── Current Occupant ──────────────────────────
    currentAdmission: { type: mongoose.Schema.Types.ObjectId, ref: "IPDAdmission" },
    currentPatient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    occupiedSince: Date,
    // ── History ───────────────────────────────────
    occupancyHistory: [
      {
        admission: { type: mongoose.Schema.Types.ObjectId, ref: "IPDAdmission" },
        patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
        admittedAt: Date,
        dischargedAt: Date,
        totalDays: Number,
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BedSchema.index({ ward: 1, status: 1 });

module.exports = mongoose.model("Bed", BedSchema);
