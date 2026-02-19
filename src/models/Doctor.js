const mongoose = require("mongoose");

const DoctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: String, unique: true },
    specialization: {
      type: String,
      required: true,
      enum: [
        "General Practice", "Cardiology", "Neurology", "Orthopedics", "Pediatrics",
        "Dermatology", "Oncology", "Radiology", "Surgery", "Psychiatry",
        "Gynecology", "Urology", "ENT", "Ophthalmology", "Anesthesiology",
        "Pathology", "Emergency Medicine", "Other",
      ],
    },
    department: { type: String, required: true },
    qualifications: [{ degree: String, institution: String, year: Number }],
    licenseNumber: { type: String, required: true, unique: true },
    experience: { type: Number, default: 0 },
    consultationFee: { type: Number, required: true, min: 0 },
    // ── Weekly Schedule ───────────────────────────
    availability: [
      {
        day: { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"] },
        startTime: String,
        endTime: String,
        maxAppointments: { type: Number, default: 20 },
      },
    ],
    // ── OPD / IPD Settings ────────────────────────
    opdEnabled: { type: Boolean, default: true },
    ipdEnabled: { type: Boolean, default: false },
    // ── Stats ─────────────────────────────────────
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalPatients: { type: Number, default: 0 },
    bio: String,
    signature: String, // URL to doctor signature image
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DoctorSchema.pre("save", async function (next) {
  if (!this.doctorId) {
    const count = await mongoose.model("Doctor").countDocuments();
    this.doctorId = `DOC-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Doctor", DoctorSchema);
