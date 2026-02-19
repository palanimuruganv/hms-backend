const Emergency = require("../models/Emergency");
const Bed = require("../models/Bed");
const { asyncHandler } = require("../middlewares/errorHandler");

exports.getCases = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, status, triageLevel, date } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (triageLevel) filter["triage.level"] = triageLevel;
  if (date) {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    filter.arrivalTime = { $gte: d, $lt: next };
  }

  const [cases, total] = await Promise.all([
    Emergency.find(filter)
      .populate("patient", "patientId name phone gender dateOfBirth")
      .populate({ path: "attendingDoctor", populate: { path: "user", select: "name" } })
      .populate("bed", "bedNumber ward")
      .sort({ arrivalTime: -1 })
      .skip((page - 1) * limit).limit(+limit),
    Emergency.countDocuments(filter),
  ]);
  res.json({ success: true, count: cases.length, total, pages: Math.ceil(total / limit), data: cases });
});

exports.getCase = asyncHandler(async (req, res) => {
  const ec = await Emergency.findById(req.params.id)
    .populate("patient")
    .populate({ path: "attendingDoctor", populate: { path: "user", select: "name" } })
    .populate("bed")
    .populate("labOrders")
    .populate("registeredBy", "name");
  if (!ec) return res.status(404).json({ success: false, message: "Emergency case not found." });
  res.json({ success: true, data: ec });
});

exports.createCase = asyncHandler(async (req, res) => {
  const emergencyCase = await Emergency.create({ ...req.body, registeredBy: req.user.id });

  // Assign bed if provided
  if (req.body.bedId) {
    const bed = await Bed.findById(req.body.bedId);
    if (bed && bed.status === "available") {
      emergencyCase.bed = bed._id;
      await Bed.findByIdAndUpdate(bed._id, { status: "occupied", currentPatient: emergencyCase.patient });
      await emergencyCase.save();
    }
  }

  await emergencyCase.populate("patient", "patientId name phone gender");
  res.status(201).json({ success: true, data: emergencyCase });
});

exports.updateCase = asyncHandler(async (req, res) => {
  const ec = await Emergency.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!ec) return res.status(404).json({ success: false, message: "Emergency case not found." });
  res.json({ success: true, data: ec });
});

exports.addVitals = asyncHandler(async (req, res) => {
  const ec = await Emergency.findById(req.params.id);
  if (!ec) return res.status(404).json({ success: false, message: "Case not found." });
  ec.vitals.push({ ...req.body, recordedBy: req.user.id });
  await ec.save();
  res.json({ success: true, data: ec.vitals });
});

exports.updateTriage = asyncHandler(async (req, res) => {
  const ec = await Emergency.findById(req.params.id);
  if (!ec) return res.status(404).json({ success: false, message: "Case not found." });
  ec.triage = { ...ec.triage, ...req.body, performedBy: req.user.id, triageTime: new Date() };
  await ec.save();
  res.json({ success: true, data: ec.triage });
});

exports.addTreatmentNote = asyncHandler(async (req, res) => {
  const ec = await Emergency.findById(req.params.id);
  if (!ec) return res.status(404).json({ success: false, message: "Case not found." });
  ec.treatmentNotes.push({ note: req.body.note, writtenBy: req.user.id });
  await ec.save();
  res.json({ success: true, data: ec.treatmentNotes });
});

exports.dispositionCase = asyncHandler(async (req, res) => {
  const { type, notes, admissionRef } = req.body;
  const ec = await Emergency.findById(req.params.id);
  if (!ec) return res.status(404).json({ success: false, message: "Case not found." });

  ec.disposition = { type, notes, admissionRef, time: new Date() };
  ec.status = type === "admitted" ? "admitted-ipd" : type === "transferred" ? "transferred" : "discharged";
  ec.dischargeTime = new Date();

  // Free bed
  if (ec.bed) {
    await Bed.findByIdAndUpdate(ec.bed, { status: "cleaning", currentPatient: null, currentAdmission: null });
    ec.bed = null;
  }
  await ec.save();
  res.json({ success: true, message: "Disposition recorded.", data: ec });
});

exports.getActiveStats = asyncHandler(async (req, res) => {
  const [active, byTriage, today] = await Promise.all([
    Emergency.countDocuments({ status: { $in: ["active", "under-treatment"] } }),
    Emergency.aggregate([
      { $match: { status: { $in: ["active", "under-treatment", "stable", "critical"] } } },
      { $group: { _id: "$triage.level", count: { $sum: 1 } } },
    ]),
    Emergency.countDocuments({ arrivalTime: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
  ]);
  res.json({ success: true, data: { activeCases: active, byTriage, todayTotal: today } });
});
