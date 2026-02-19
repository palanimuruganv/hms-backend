const mongoose = require("mongoose");

// ── Lab Test Catalog ─────────────────────────────────────
const LabTestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, uppercase: true },
    category: {
      type: String,
      enum: ["hematology", "biochemistry", "microbiology", "pathology", "radiology", "serology", "urine", "other"],
    },
    department: String,
    price: { type: Number, required: true },
    turnaroundTime: String, // "2 hours", "1 day"
    // ── Reference Ranges ────────────────────────────
    parameters: [
      {
        name: String,          // "Hemoglobin"
        unit: String,          // "g/dL"
        normalRange: {
          male: { min: Number, max: Number },
          female: { min: Number, max: Number },
          child: { min: Number, max: Number },
        },
        method: String,
      },
    ],
    sampleType: { type: String, enum: ["blood", "urine", "stool", "sputum", "swab", "csf", "tissue", "other"] },
    sampleVolume: String,
    instructions: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Lab Order ─────────────────────────────────────────────
const LabOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    // ── Source ────────────────────────────────────
    sourceType: { type: String, enum: ["opd", "ipd", "emergency", "direct"], default: "opd" },
    sourceRef: { type: mongoose.Schema.Types.ObjectId },
    // ── Tests ─────────────────────────────────────
    tests: [
      {
        test: { type: mongoose.Schema.Types.ObjectId, ref: "LabTest", required: true },
        testName: String,
        status: { type: String, enum: ["pending", "sample-collected", "processing", "completed", "cancelled"], default: "pending" },
        priority: { type: String, enum: ["routine", "urgent", "stat"], default: "routine" },
        // ── Results ───────────────────────────────
        results: [
          {
            parameter: String,
            value: String,
            unit: String,
            referenceRange: String,
            flag: { type: String, enum: ["normal", "low", "high", "critical-low", "critical-high"] },
          },
        ],
        reportNotes: String,
        resultFile: String,  // uploaded PDF
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        processedAt: Date,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verifiedAt: Date,
      },
    ],
    // ── Sample ────────────────────────────────────
    sampleCollected: { type: Boolean, default: false },
    sampleCollectedAt: Date,
    sampleCollectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sampleBarcode: String,
    // ── Billing ───────────────────────────────────
    totalAmount: Number,
    paymentStatus: { type: String, enum: ["pending", "paid", "waived"], default: "pending" },
    bill: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" },
    // ── Status ────────────────────────────────────
    status: { type: String, enum: ["pending", "in-progress", "completed", "cancelled"], default: "pending" },
    reportReadyAt: Date,
    deliveredAt: Date,
    notes: String,
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

LabOrderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model("LabOrder").countDocuments();
    this.orderId = `LAB-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

LabOrderSchema.index({ patient: 1, createdAt: -1 });
LabOrderSchema.index({ status: 1 });

const LabTest = mongoose.model("LabTest", LabTestSchema);
const LabOrder = mongoose.model("LabOrder", LabOrderSchema);

module.exports = { LabTest, LabOrder };
