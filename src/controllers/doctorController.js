// ── Doctor Controller ─────────────────────────────────────────────────────────
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { asyncHandler } = require("../middlewares/errorHandler");

exports.getDoctors = asyncHandler(async (req, res) => {
  const { specialization, department, isAvailable, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (specialization) filter.specialization = specialization;
  if (department) filter.department = { $regex: department, $options: "i" };
  if (isAvailable !== undefined) filter.isAvailable = isAvailable === "true";

  const [doctors, total] = await Promise.all([
    Doctor.find(filter).populate("user", "name email phone avatar").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit),
    Doctor.countDocuments(filter),
  ]);
  res.json({ success: true, count: doctors.length, total, data: doctors });
});

exports.getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate("user", "name email phone avatar");
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
  res.json({ success: true, data: doctor });
});

exports.createDoctor = asyncHandler(async (req, res) => {
  const { name, email, password, phone, ...doctorData } = req.body;
  const user = await User.create({ name, email, password, phone, role: "doctor" });
  try {
    const doctor = await Doctor.create({ user: user._id, ...doctorData });
    await doctor.populate("user", "name email phone");
    res.status(201).json({ success: true, data: doctor });
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    throw err;
  }
});

exports.updateDoctor = asyncHandler(async (req, res) => {
  const { name, phone, email, ...doctorData } = req.body;
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
  if (name || phone || email) await User.findByIdAndUpdate(doctor.user, { name, phone, email });
  const updated = await Doctor.findByIdAndUpdate(req.params.id, doctorData, { new: true }).populate("user", "name email phone");
  res.json({ success: true, data: updated });
});

exports.deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
  await Promise.all([Doctor.findByIdAndUpdate(req.params.id, { isAvailable: false }), User.findByIdAndUpdate(doctor.user, { isActive: false })]);
  res.json({ success: true, message: "Doctor deactivated." });
});

exports.updateAvailability = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(req.params.id, { availability: req.body.availability }, { new: true });
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
  res.json({ success: true, data: doctor.availability });
});

exports.getDoctorStats = asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const [total, todayOPD, completed] = await Promise.all([
    Appointment.countDocuments({ doctor: req.params.id }),
    Appointment.countDocuments({ doctor: req.params.id, appointmentDate: { $gte: today, $lt: tomorrow } }),
    Appointment.countDocuments({ doctor: req.params.id, status: "completed" }),
  ]);
  res.json({ success: true, data: { total, today: todayOPD, completed } });
});

exports.getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query;
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });

  const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
  const schedule = doctor.availability.find(a => a.day === dayName);
  if (!schedule) return res.json({ success: true, slots: [], message: "Doctor not available on this day." });

  const slots = [];
  const [sh, sm] = schedule.startTime.split(":").map(Number);
  const [eh, em] = schedule.endTime.split(":").map(Number);
  let cur = sh * 60 + sm;
  while (cur + 30 <= eh * 60 + em) {
    const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    slots.push({ start: fmt(cur), end: fmt(cur + 30) });
    cur += 30;
  }

  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const next = new Date(d); next.setDate(next.getDate() + 1);
  const booked = await Appointment.find({ doctor: doctorId, appointmentDate: { $gte: d, $lt: next }, status: { $nin: ["cancelled", "no-show"] } }).select("timeSlot");
  const bookedStarts = booked.map(a => a.timeSlot?.start);
  res.json({ success: true, date, slots: slots.filter(s => !bookedStarts.includes(s.start)) });
});

module.exports.doctorExports = { getDoctors: exports.getDoctors, getDoctor: exports.getDoctor, createDoctor: exports.createDoctor, updateDoctor: exports.updateDoctor, deleteDoctor: exports.deleteDoctor, updateAvailability: exports.updateAvailability, getDoctorStats: exports.getDoctorStats, getAvailableSlots: exports.getAvailableSlots };
