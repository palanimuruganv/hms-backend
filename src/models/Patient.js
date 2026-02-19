const mongoose = require("mongoose");

const PatientSchema = new mongoose.Schema(
  {
    patientId: { type: String, unique: true },
    // ── Personal Info ─────────────────────────────
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] },
    photo: String,
    // ── Contact ───────────────────────────────────
    phone: { type: String, required: true },
    email: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: "India" },
    },
    // ── Emergency Contact ─────────────────────────
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    // ── Medical Info ──────────────────────────────
    allergies: [String],
    chronicConditions: [String],
    currentMedications: [String],
    // ── Insurance ─────────────────────────────────
    insurance: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      expiryDate: Date,
      coverageDetails: String,
    },
    // ── Registration ──────────────────────────────
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    // ── Documents ─────────────────────────────────
    documents: [
      {
        name: String,
        type: { type: String, enum: ["lab_report", "prescription", "imaging", "consent", "other"] },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

PatientSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - new Date(this.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
});

PatientSchema.pre("save", async function (next) {
  if (!this.patientId) {
    const count = await mongoose.model("Patient").countDocuments();
    this.patientId = `PAT-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

PatientSchema.index({ name: "text", phone: "text", patientId: "text" });

module.exports = mongoose.model("Patient", PatientSchema);
