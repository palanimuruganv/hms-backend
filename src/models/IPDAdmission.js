const mongoose = require("mongoose");

const IPDAdmissionSchema = new mongoose.Schema(
  {
    admissionId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    bed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed" },
    // ── Admission Details ────────────────────────
    admissionDate: { type: Date, default: Date.now },
    admissionType: { type: String, enum: ["elective", "emergency", "transfer", "maternity"], default: "elective" },
    admissionSource: { type: String, enum: ["opd", "emergency", "referral", "direct"], default: "direct" },
    opdVisitRef: { type: mongoose.Schema.Types.ObjectId, ref: "OPDVisit" },
    // ── Status ────────────────────────────────────
    status: {
      type: String,
      enum: ["admitted", "under-treatment", "stable", "critical", "transferred", "discharged", "ama", "expired"],
      default: "admitted",
    },
    // ── Clinical ──────────────────────────────────
    chiefComplaint: String,
    admissionDiagnosis: String,
    finalDiagnosis: String,
    icdCode: String,
    // ── Vitals History ────────────────────────────
    vitalsHistory: [
      {
        bloodPressure: String,
        heartRate: Number,
        temperature: Number,
        weight: Number,
        oxygenSaturation: Number,
        respiratoryRate: Number,
        bloodSugar: Number,
        recordedAt: { type: Date, default: Date.now },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: String,
      },
    ],
    // ── Medications / MAR ─────────────────────────
    medicationOrders: [
      {
        medicine: { type: mongoose.Schema.Types.ObjectId, ref: "Medicine" },
        name: String,
        dosage: String,
        frequency: String,
        route: String,
        startDate: Date,
        endDate: Date,
        orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
        administrationRecord: [
          {
            administeredAt: Date,
            administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            dose: String,
            status: { type: String, enum: ["given", "missed", "refused", "held"] },
            notes: String,
          },
        ],
      },
    ],
    // ── Activities / Progress Notes ───────────────
    progressNotes: [
      {
        note: String,
        type: { type: String, enum: ["doctor", "nurse", "general"] },
        writtenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        writtenAt: { type: Date, default: Date.now },
      },
    ],
    // ── Procedures & Medical Dressings ────────────
    procedures: [
      {
        name: String,
        description: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
        performedAt: Date,
        outcome: String,
        notes: String,
      },
    ],
    dressingRecords: [
      {
        woundType: String,
        dressingType: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        performedAt: { type: Date, default: Date.now },
        observations: String,
        nextDressingDate: Date,
      },
    ],
    // ── Bed Transfers ─────────────────────────────
    bedTransfers: [
      {
        fromBed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed" },
        toBed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed" },
        transferredAt: { type: Date, default: Date.now },
        transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
      },
    ],
    // ── Lab Orders ────────────────────────────────
    labOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "LabOrder" }],
    // ── Surgery ───────────────────────────────────
    surgeries: [
      {
        name: String,
        surgeons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }],
        anesthetist: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
        scheduledAt: Date,
        performedAt: Date,
        duration: Number, // minutes
        outcome: String,
        notes: String,
      },
    ],
    // ── Discharge ─────────────────────────────────
    dischargeDate: Date,
    dischargeType: { type: String, enum: ["normal", "against-medical-advice", "transfer", "death", "referral"] },
    dischargeSummary: {
      finalDiagnosis: String,
      treatmentGiven: String,
      condition: { type: String, enum: ["improved", "stable", "deteriorated", "unchanged"] },
      followUpAdvice: String,
      followUpDate: Date,
      dischargeInstructions: String,
      medications: [{ name: String, dosage: String, frequency: String, duration: String }],
      preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    },
    // ── Billing ───────────────────────────────────
    bill: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" },
    // ── Consent ───────────────────────────────────
    consentForms: [{ name: String, url: String, signedAt: Date, signedBy: String }],
    admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

IPDAdmissionSchema.pre("save", async function (next) {
  if (!this.admissionId) {
    const count = await mongoose.model("IPDAdmission").countDocuments();
    this.admissionId = `IPD-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

IPDAdmissionSchema.index({ patient: 1, status: 1 });
IPDAdmissionSchema.index({ bed: 1 });

module.exports = mongoose.model("IPDAdmission", IPDAdmissionSchema);
