const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    staffId: { type: String, unique: true },
    employeeCode: { type: String, unique: true, sparse: true },
    designation: { type: String, required: true },
    department: { type: String, required: true },
    role: {
      type: String,
      enum: ["nurse", "receptionist", "pharmacist", "lab_technician", "admin", "accountant", "ward_boy", "cleaner", "security", "other"],
      required: true,
    },
    // ── Personal Info ─────────────────────────────
    dateOfBirth: Date,
    gender: { type: String, enum: ["male", "female", "other"] },
    address: { street: String, city: String, state: String, zipCode: String },
    emergencyContact: { name: String, relationship: String, phone: String },
    // ── Employment ────────────────────────────────
    joiningDate: { type: Date, default: Date.now },
    employmentType: { type: String, enum: ["full-time", "part-time", "contract", "intern"], default: "full-time" },
    shift: { type: String, enum: ["morning", "afternoon", "night", "rotating"] },
    salary: { type: Number },
    // ── Qualifications ────────────────────────────
    qualifications: [{ degree: String, institution: String, year: Number }],
    licenseNumber: String,
    // ── Status ────────────────────────────────────
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StaffSchema.pre("save", async function (next) {
  if (!this.staffId) {
    const count = await mongoose.model("Staff").countDocuments();
    this.staffId = `STF-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Staff", StaffSchema);
