const OPDVisit = require("../models/OPDVisit");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const { asyncHandler } = require("../middlewares/errorHandler");

exports.getVisits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, status, doctorId, patientId, date, type } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (doctorId) filter.doctor = doctorId;
  if (patientId) filter.patient = patientId;
  if (date) {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    filter.visitDate = { $gte: d, $lt: next };
  }

  const [visits, total] = await Promise.all([
    OPDVisit.find(filter)
      .populate("patient", "patientId name phone gender dateOfBirth bloodGroup")
      .populate("doctor", "doctorId specialization consultationFee")
      .populate({ path: "doctor", populate: { path: "user", select: "name" } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit),
    OPDVisit.countDocuments(filter),
  ]);

  res.json({ success: true, count: visits.length, total, pages: Math.ceil(total / limit), data: visits });
});

exports.getVisit = asyncHandler(async (req, res) => {
  const visit = await OPDVisit.findById(req.params.id)
    .populate("patient")
    .populate({ path: "doctor", populate: { path: "user", select: "name email" } })
    .populate("prescription.medications.medicine", "name strength unit")
    .populate("labOrders")
    .populate("registeredBy", "name")
    .populate("auditLog.performedBy", "name");
  if (!visit) return res.status(404).json({ success: false, message: "Visit not found." });
  res.json({ success: true, data: visit });
});

exports.createVisit = asyncHandler(async (req, res) => {
  const { patientId, doctorId, type, chiefComplaint, symptoms, consultationFee } = req.body;

  const [patient, doctor] = await Promise.all([
    Patient.findById(patientId),
    Doctor.findById(doctorId),
  ]);
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });

  // Auto-generate token number for today
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const todayCount = await OPDVisit.countDocuments({ doctor: doctorId, visitDate: { $gte: today, $lt: tomorrow } });

  const visit = await OPDVisit.create({
    patient: patientId,
    doctor: doctorId,
    type: type || "new",
    chiefComplaint,
    symptoms,
    tokenNumber: `T-${String(todayCount + 1).padStart(3, "0")}`,
    consultationFee: consultationFee ?? doctor.consultationFee,
    registeredBy: req.user.id,
    auditLog: [{ action: "Visit registered", performedBy: req.user.id }],
  });

  await visit.populate([
    { path: "patient", select: "patientId name phone gender" },
    { path: "doctor", populate: { path: "user", select: "name" } },
  ]);

  res.status(201).json({ success: true, data: visit });
});

exports.updateVisit = asyncHandler(async (req, res) => {
  const visit = await OPDVisit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!visit) return res.status(404).json({ success: false, message: "Visit not found." });
  res.json({ success: true, data: visit });
});

exports.updateVitals = asyncHandler(async (req, res) => {
  const visit = await OPDVisit.findById(req.params.id);
  if (!visit) return res.status(404).json({ success: false, message: "Visit not found." });
  visit.vitals = { ...req.body, recordedAt: new Date(), recordedBy: req.user.id };
  visit.auditLog.push({ action: "Vitals recorded", performedBy: req.user.id });
  await visit.save();
  res.json({ success: true, data: visit.vitals });
});

exports.savePrescription = asyncHandler(async (req, res) => {
  const visit = await OPDVisit.findById(req.params.id);
  if (!visit) return res.status(404).json({ success: false, message: "Visit not found." });
  visit.prescription = req.body;
  visit.diagnosis = req.body.diagnosis || visit.diagnosis;
  visit.notes = req.body.notes || visit.notes;
  visit.status = "completed";
  visit.auditLog.push({ action: "Prescription saved", performedBy: req.user.id, details: `${req.body.medications?.length || 0} medications` });
  await visit.save();
  res.json({ success: true, data: visit });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const visit = await OPDVisit.findById(req.params.id);
  if (!visit) return res.status(404).json({ success: false, message: "Visit not found." });
  visit.status = status;
  visit.auditLog.push({ action: `Status changed to ${status}`, performedBy: req.user.id });
  await visit.save();
  res.json({ success: true, data: visit });
});

exports.getTodayQueue = asyncHandler(async (req, res) => {
  const { doctorId } = req.query;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const filter = { visitDate: { $gte: today, $lt: tomorrow }, status: { $nin: ["completed", "cancelled"] } };
  if (doctorId) filter.doctor = doctorId;

  const queue = await OPDVisit.find(filter)
    .populate("patient", "patientId name phone gender dateOfBirth")
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .sort({ createdAt: 1 });

  res.json({ success: true, count: queue.length, data: queue });
});
