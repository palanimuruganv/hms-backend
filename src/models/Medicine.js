const mongoose = require("mongoose");

const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: String,
    phone: { type: String, required: true },
    email: String,
    address: String,
    gstNumber: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const MedicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    genericName: String,
    brand: String,
    category: {
      type: String,
      enum: ["tablet", "capsule", "syrup", "injection", "cream", "drops", "inhaler", "powder", "solution", "suppository", "patch", "other"],
      required: true,
    },
    composition: String,
    strength: String,           // "500mg", "10mg/5ml"
    unit: { type: String, default: "units" }, // tablets, ml, vials
    manufacturer: String,
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    // ── Stock ─────────────────────────────────────
    stock: {
      quantity: { type: Number, required: true, min: 0, default: 0 },
      minThreshold: { type: Number, default: 20 },
      maxThreshold: { type: Number },
      location: String,  // rack/shelf
    },
    batches: [
      {
        batchNumber: { type: String, required: true },
        quantity: Number,
        expiryDate: { type: Date, required: true },
        mrp: Number,
        purchasePrice: Number,
        receivedDate: { type: Date, default: Date.now },
      },
    ],
    // ── Pricing ───────────────────────────────────
    purchasePrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    gstPercent: { type: Number, default: 0 },
    // ── Regulatory ────────────────────────────────
    requiresPrescription: { type: Boolean, default: false },
    isScheduledDrug: { type: Boolean, default: false },
    scheduleType: String, // H, H1, X etc.
    barcode: String,
    hsn: String,   // HSN code for GST
    // ── Flags ─────────────────────────────────────
    isActive: { type: Boolean, default: true },
    // ── Transactions ──────────────────────────────
    transactions: [
      {
        type: { type: String, enum: ["purchase", "dispensed", "returned", "expired", "adjustment", "transfer"] },
        quantity: Number,
        batchNumber: String,
        referenceId: String,   // OPD/IPD/Bill ID
        referenceType: String, // "OPDVisit", "IPDAdmission", "Bill"
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        date: { type: Date, default: Date.now },
        notes: String,
      },
    ],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

MedicineSchema.virtual("isLowStock").get(function () {
  return this.stock.quantity <= this.stock.minThreshold;
});

MedicineSchema.virtual("isExpired").get(function () {
  return this.batches.some(b => b.expiryDate < new Date() && b.quantity > 0);
});

MedicineSchema.index({ name: "text", genericName: "text", brand: "text" });

const Supplier = mongoose.model("Supplier", SupplierSchema);
const Medicine = mongoose.model("Medicine", MedicineSchema);

module.exports = { Medicine, Supplier };
