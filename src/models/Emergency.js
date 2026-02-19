const mongoose = require("mongoose");

const EmergencySchema = new mongoose.Schema(
  {
    caseId: { type: String, unique: true },
    // ── Patient ───────────────────────────────────
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    // For unknown/unregistered patients
    unknownPatient: {
      name: { type: String, default: "Unknown" },
      age: Number,
      gender: String,
      bystander: { name: String, phone: String, relationship: String },
    },
    isKnownPatient: { type: Boolean, default: false },
    // ── Arrival ───────────────────────────────────
    arrivalTime: { type: Date, default: Date.now },
    arrivalMode: { type: String, enum: ["ambulance", "walk-in", "police", "referred", "other"] },
    // ── Triage ────────────────────────────────────
    triage: {
      level: {
        type: String,
        enum: ["immediate", "urgent", "less-urgent", "non-urgent"],
        // RED=immediate, YELLOW=urgent, GREEN=less-urgent, BLACK=non-urgent/deceased
      },
      chiefComplaint: String,
      mechanism: String,      // mechanism of injury
      symptoms: [String],
      performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      triageTime: { type: Date, default: Date.now },
    },
    // ── Vitals ────────────────────────────────────
    vitals: [
      {
        bloodPressure: String,
        heartRate: Number,
        temperature: Number,
        oxygenSaturation: Number,
        respiratoryRate: Number,
        gcs: Number,         // Glasgow Coma Scale
        painScore: Number,   // 0-10
        recordedAt: { type: Date, default: Date.now },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    // ── Attending Doctors ─────────────────────────
    attendingDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    attendingTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // ── Bed ───────────────────────────────────────
    bed: { type: mongoose.Schema.Types.ObjectId, ref: "Bed" },
    // ── Status & Disposition ─────────────────────
    status: {
      type: String,
      enum: ["active", "under-treatment", "stable", "critical", "discharged", "admitted-ipd", "transferred", "expired", "left-without-being-seen"],
      default: "active",
    },
    disposition: {
      type: { type: String, enum: ["discharged", "admitted", "transferred", "expired", "lwbs"] },
      time: Date,
      notes: String,
      admissionRef: { type: mongoose.Schema.Types.ObjectId, ref: "IPDAdmission" },
    },
    // ── Treatment ────────────────────────────────
    treatmentNotes: [
      {
        note: String,
        writtenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        writtenAt: { type: Date, default: Date.now },
      },
    ],
    medications: [
      {
        name: String,
        dosage: String,
        route: String,
        givenAt: Date,
        givenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    procedures: [
      {
        name: String,
        performedAt: Date,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        outcome: String,
      },
    ],
    labOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "LabOrder" }],
    // ── MLC (Medico-Legal Case) ───────────────────
    isMLC: { type: Boolean, default: false },
    mlcDetails: {
      policeStation: String,
      reportNumber: String,
      officerName: String,
      reportedAt: Date,
    },
    // ── Discharge Summary ─────────────────────────
    dischargeSummary: String,
    dischargeTime: Date,
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

EmergencySchema.pre("save", async function (next) {
  if (!this.caseId) {
    const count = await mongoose.model("Emergency").countDocuments();
    const now = new Date();
    this.caseId = `EM-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

EmergencySchema.index({ status: 1, arrivalTime: -1 });

module.exports = mongoose.model("Emergency", EmergencySchema);
