const mongoose = require("mongoose");

const BillSchema = new mongoose.Schema(
  {
    billId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    // ── Source ────────────────────────────────────
    billType: { type: String, enum: ["opd", "ipd", "emergency", "pharmacy", "lab", "combined"], required: true },
    sourceRef: { type: mongoose.Schema.Types.ObjectId },   // OPDVisit / IPDAdmission / Emergency ID
    sourceModel: String,
    // ── Line Items ────────────────────────────────
    items: [
      {
        category: {
          type: String,
          enum: ["consultation", "bed", "nursing", "surgery", "procedure", "medicine", "lab", "radiology", "equipment", "oxygen", "blood", "other"],
        },
        description: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        unitPrice: { type: Number, required: true },
        discount: { type: Number, default: 0 },        // percentage
        gstPercent: { type: Number, default: 0 },
        gstAmount: { type: Number, default: 0 },
        totalAmount: Number,
        date: { type: Date, default: Date.now },
        referenceId: String,
      },
    ],
    // ── Totals ────────────────────────────────────
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    totalGST: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    // ── Insurance ─────────────────────────────────
    insurance: {
      provider: String,
      policyNumber: String,
      claimNumber: String,
      approvedAmount: { type: Number, default: 0 },
      status: { type: String, enum: ["not-claimed", "pending", "approved", "rejected", "partial"], default: "not-claimed" },
      remarks: String,
    },
    // ── Payments ──────────────────────────────────
    payments: [
      {
        amount: Number,
        method: { type: String, enum: ["cash", "card", "upi", "netbanking", "cheque", "insurance", "neft", "other"] },
        transactionId: String,
        paidAt: { type: Date, default: Date.now },
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        notes: String,
      },
    ],
    paidAmount: { type: Number, default: 0 },
    balanceDue: { type: Number },
    advanceDeposit: { type: Number, default: 0 },
    // ── Status ────────────────────────────────────
    status: {
      type: String,
      enum: ["draft", "generated", "partially-paid", "paid", "overdue", "cancelled", "refunded", "written-off"],
      default: "draft",
    },
    dueDate: Date,
    notes: String,
    // ── Audit ─────────────────────────────────────
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

BillSchema.pre("save", async function (next) {
  if (!this.billId) {
    const count = await mongoose.model("Bill").countDocuments();
    const y = new Date().getFullYear();
    this.billId = `BILL-${y}-${String(count + 1).padStart(6, "0")}`;
  }
  // Recalculate item totals
  this.items = this.items.map(item => {
    const base = item.quantity * item.unitPrice * (1 - item.discount / 100);
    item.gstAmount = base * (item.gstPercent / 100);
    item.totalAmount = base + item.gstAmount;
    return item;
  });
  this.balanceDue = this.netAmount - this.paidAmount;
  if (this.paidAmount >= this.netAmount) this.status = "paid";
  else if (this.paidAmount > 0) this.status = "partially-paid";
  next();
});

BillSchema.index({ patient: 1, createdAt: -1 });
BillSchema.index({ status: 1 });

module.exports = mongoose.model("Bill", BillSchema);
