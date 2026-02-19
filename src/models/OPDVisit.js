const mongoose = require("mongoose");

const OPDVisitSchema = new mongoose.Schema(
  {
    visitId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    visitDate: { type: Date, default: Date.now },
    tokenNumber: String,
    // ── Status ────────────────────────────────────
    status: {
      type: String,
      enum: ["waiting", "in-consultation", "completed", "cancelled", "referred"],
      default: "waiting",
    },
    type: {
      type: String,
      enum: ["new", "follow-up", "emergency", "referral"],
      default: "new",
    },
    // ── Triage / Chief Complaint ──────────────────
    chiefComplaint: String,
    symptoms: [String],
    // ── Vitals ────────────────────────────────────
    vitals: {
      bloodPressure: String,       // "120/80"
      heartRate: Number,           // bpm
      temperature: Number,         // °F or °C
      weight: Number,              // kg
      height: Number,              // cm
      bmi: Number,
      oxygenSaturation: Number,    // SpO2 %
      respiratoryRate: Number,
      bloodSugar: Number,
      recordedAt: { type: Date, default: Date.now },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    // ── Consultation ──────────────────────────────
    diagnosis: String,
    icdCode: String,
    notes: String,
    clinicalFindings: String,
    treatmentPlan: String,
    // ── Prescription ──────────────────────────────
    prescription: {
      medications: [
        {
          medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
          name: String,
          dosage: String,
          frequency: String,   // "1-0-1", "1-1-1"
          duration: String,    // "5 days"
          route: { type: String, enum: ["oral", "iv", "im", "topical", "inhaled", "other"] },
          instructions: String,
          quantity: Number,
        },
      ],
      instructions: String,
      followUpDate: Date,
      followUpNotes: String,
      printedAt: Date,
    },
    // ── Lab Orders ────────────────────────────────
    labOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "LabOrder" }],
    // ── Referral ──────────────────────────────────
    referral: {
      referredTo: String,
      hospital: String,
      reason: String,
      urgency: { type: String, enum: ["routine", "urgent", "emergency"] },
    },
    // ── Billing ───────────────────────────────────
    bill: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" },
    consultationFee: Number,
    paymentStatus: { type: String, enum: ["pending", "paid", "waived"], default: "pending" },
    // ── Audit ─────────────────────────────────────
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    auditLog: [
      {
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        details: String,
      },
    ],
  },
  { timestamps: true }
);

OPDVisitSchema.pre("save", async function (next) {
  if (!this.visitId) {
    const count = await mongoose.model("OPDVisit").countDocuments();
    const date = new Date();
    this.visitId = `OPD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2,"0")}-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

OPDVisitSchema.index({ patient: 1, visitDate: -1 });
OPDVisitSchema.index({ doctor: 1, visitDate: -1 });

module.exports = mongoose.model("OPDVisit", OPDVisitSchema);
