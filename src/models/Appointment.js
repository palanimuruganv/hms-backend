const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    appointmentDate: { type: Date, required: true },
    timeSlot: { start: String, end: String },
    tokenNumber: Number,
    type: { type: String, enum: ["opd", "follow-up", "procedure", "teleconsultation"], default: "opd" },
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "checked-in", "in-consultation", "completed", "cancelled", "no-show", "rescheduled"],
      default: "scheduled",
    },
    reason: String,
    symptoms: [String],
    notes: String,
    fee: Number,
    paymentStatus: { type: String, enum: ["pending", "paid", "waived"], default: "pending" },
    opdVisitRef: { type: mongoose.Schema.Types.ObjectId, ref: "OPDVisit" },
    cancelledBy: String,
    cancellationReason: String,
    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AppointmentSchema.pre("save", async function (next) {
  if (!this.appointmentId) {
    const count = await mongoose.model("Appointment").countDocuments();
    this.appointmentId = `APT-${String(count + 1).padStart(7, "0")}`;
  }
  next();
});

AppointmentSchema.index({ doctor: 1, appointmentDate: 1 });
AppointmentSchema.index({ patient: 1, appointmentDate: -1 });

module.exports = mongoose.model("Appointment", AppointmentSchema);
