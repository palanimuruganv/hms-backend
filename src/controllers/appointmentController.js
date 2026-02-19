const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const { asyncHandler } = require("../middlewares/errorHandler");


exports.getAppointments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, status, doctorId, patientId, date, type } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (doctorId) filter.doctor = doctorId;
  if (patientId) filter.patient = patientId;
  if (date) {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    filter.appointmentDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  }

  const [apts, total] = await Promise.all([
    Appointment.find(filter)
      .populate("patient", "patientId name phone gender")
      .populate({ path: "doctor", populate: { path: "user", select: "name" } })
      .sort({ appointmentDate: -1 })
      .skip((page - 1) * limit).limit(+limit),
    Appointment.countDocuments(filter),
  ]);
  res.json({ success: true, count: apts.length, total, pages: Math.ceil(total / limit), data: apts });
});

exports.getAppointment = asyncHandler(async (req, res) => {
  const apt = await Appointment.findById(req.params.id)
    .populate("patient")
    .populate({ path: "doctor", populate: { path: "user", select: "name email" } });
  if (!apt) return res.status(404).json({ success: false, message: "Appointment not found." });
  res.json({ success: true, data: apt });
});

exports.bookAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, appointmentDate, timeSlot, type, reason, symptoms } = req.body;

  const [patient, doctor] = await Promise.all([Patient.findById(patientId), Doctor.findById(doctorId)]);
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });

  const conflict = await Appointment.findOne({
    doctor: doctorId, appointmentDate: new Date(appointmentDate),
    "timeSlot.start": timeSlot?.start, status: { $nin: ["cancelled", "no-show"] },
  });
  if (conflict) return res.status(409).json({ success: false, message: "This time slot is already booked." });

  const apt = await Appointment.create({
    patient: patientId, doctor: doctorId, appointmentDate: new Date(appointmentDate),
    timeSlot, type, reason, symptoms, fee: doctor.consultationFee, bookedBy: req.user.id,
  });

  await apt.populate([{ path: "patient", select: "patientId name phone" }, { path: "doctor", populate: { path: "user", select: "name" } }]);
  res.status(201).json({ success: true, data: apt });
});

exports.updateAppointment = asyncHandler(async (req, res) => {
  const apt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!apt) return res.status(404).json({ success: false, message: "Appointment not found." });
  res.json({ success: true, data: apt });
});

exports.cancelAppointment = asyncHandler(async (req, res) => {
  const apt = await Appointment.findById(req.params.id);
  if (!apt) return res.status(404).json({ success: false, message: "Appointment not found." });
  if (["completed", "cancelled"].includes(apt.status)) return res.status(400).json({ success: false, message: `Cannot cancel a ${apt.status} appointment.` });
  apt.status = "cancelled";
  apt.cancelledBy = req.user.role;
  apt.cancellationReason = req.body.reason;
  await apt.save();
  res.json({ success: true, data: apt });
});

exports.getTodayAppointments = asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const apts = await Appointment.find({ appointmentDate: { $gte: today, $lt: tomorrow }, status: { $ne: "cancelled" } })
    .populate("patient", "patientId name phone gender")
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .sort({ "timeSlot.start": 1 });
  res.json({ success: true, count: apts.length, data: apts });
});
