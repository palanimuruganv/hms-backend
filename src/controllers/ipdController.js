const IPDAdmission = require("../models/IPDAdmission");
const Bed = require("../models/Bed");
const Patient = require("../models/Patient");
const { asyncHandler } = require("../middlewares/errorHandler");

exports.getAdmissions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, status, doctorId, ward } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (doctorId) filter.doctor = doctorId;

  let query = IPDAdmission.find(filter)
    .populate("patient", "patientId name phone gender dateOfBirth bloodGroup")
    .populate({ path: "doctor", populate: { path: "user", select: "name" } })
    .populate("bed", "bedNumber ward room type")
    .sort({ admissionDate: -1 });

  if (ward) {
    // Filter after populate
    const results = await query;
    const filtered = results.filter(a => a.bed?.ward === ward);
    return res.json({ success: true, count: filtered.length, data: filtered });
  }

  const [admissions, total] = await Promise.all([
    query.skip((page - 1) * limit).limit(+limit),
    IPDAdmission.countDocuments(filter),
  ]);
  res.json({ success: true, count: admissions.length, total, pages: Math.ceil(total / limit), data: admissions });
});

exports.getAdmission = asyncHandler(async (req, res) => {
  const admission = await IPDAdmission.findById(req.params.id)
    .populate("patient")
    .populate({ path: "doctor", populate: { path: "user", select: "name email phone" } })
    .populate("bed")
    .populate("labOrders")
    .populate("admittedBy", "name");
  if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });
  res.json({ success: true, data: admission });
});

exports.admitPatient = asyncHandler(async (req, res) => {
  const { patientId, doctorId, bedId, admissionType, admissionSource, chiefComplaint, admissionDiagnosis } = req.body;

  // Check bed availability
  if (bedId) {
    const bed = await Bed.findById(bedId);
    if (!bed) return res.status(404).json({ success: false, message: "Bed not found." });
    if (bed.status !== "available") return res.status(409).json({ success: false, message: `Bed ${bed.bedNumber} is not available (status: ${bed.status}).` });

    const admission = await IPDAdmission.create({
      patient: patientId, doctor: doctorId, bed: bedId,
      admissionType, admissionSource, chiefComplaint, admissionDiagnosis,
      admittedBy: req.user.id,
      opdVisitRef: req.body.opdVisitRef,
    });

    // Mark bed as occupied
    await Bed.findByIdAndUpdate(bedId, {
      status: "occupied",
      currentAdmission: admission._id,
      currentPatient: patientId,
      occupiedSince: new Date(),
    });

    await admission.populate([
      { path: "patient", select: "patientId name phone" },
      { path: "doctor", populate: { path: "user", select: "name" } },
      { path: "bed", select: "bedNumber ward type" },
    ]);
    return res.status(201).json({ success: true, data: admission });
  }

  const admission = await IPDAdmission.create({
    patient: patientId, doctor: doctorId, admissionType, admissionSource, chiefComplaint, admissionDiagnosis, admittedBy: req.user.id,
  });
  res.status(201).json({ success: true, data: admission });
});

exports.addVitals = asyncHandler(async (req, res) => {
  const admission = await IPDAdmission.findById(req.params.id);
  if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });
  admission.vitalsHistory.push({ ...req.body, recordedBy: req.user.id });
  await admission.save();
  res.json({ success: true, data: admission.vitalsHistory[admission.vitalsHistory.length - 1] });
});

exports.addProgressNote = asyncHandler(async (req, res) => {
  const admission = await IPDAdmission.findById(req.params.id);
  if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });
  admission.progressNotes.push({ note: req.body.note, type: req.body.type || "general", writtenBy: req.user.id });
  await admission.save();
  res.json({ success: true, data: admission.progressNotes });
});

exports.addMedicationOrder = asyncHandler(async (req, res) => {
  const admission = await IPDAdmission.findById(req.params.id);
  if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });
  admission.medicationOrders.push(req.body);
  await admission.save();
  res.json({ success: true, data: admission.medicationOrders });
});

exports.recordMedAdministration = asyncHandler(async (req, res) => {
  const admission = await IPDAdmission.findById(req.params.id);
  if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });
  const order = admission.medicationOrders.id(req.params.orderId);
  if (!order) return res.status(404).json({ success: false, message: "Medication order not found." });
  order.administrationRecord.push({ ...req.body, administeredBy: req.user.id });
  await admission.save();
  res.json({ success: true, data: order.administrationRecord });
});

exports.addDressingRecord = asyncHandler(async (req, res) => {
  const admission = await IPDAdmission.findById(req.params.id);
  if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });
  admission.dressingRecords.push({ ...req.body, performedBy: req.user.id });
  await admission.save();
  res.json({ success: true, data: admission.dressingRecords });
});

exports.transferBed = asyncHandler(async (req, res) => {
  const { newBedId, reason } = req.body;
  const admission = await IPDAdmission.findById(req.params.id);
  if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });

  const newBed = await Bed.findById(newBedId);
  if (!newBed || newBed.status !== "available") {
    return res.status(409).json({ success: false, message: "Target bed is not available." });
  }

  const oldBedId = admission.bed;

  // Free old bed
  if (oldBedId) {
    await Bed.findByIdAndUpdate(oldBedId, { status: "cleaning", currentAdmission: null, currentPatient: null, occupiedSince: null });
  }

  // Occupy new bed
  await Bed.findByIdAndUpdate(newBedId, { status: "occupied", currentAdmission: admission._id, currentPatient: admission.patient, occupiedSince: new Date() });

  // Record transfer
  admission.bedTransfers.push({ fromBed: oldBedId, toBed: newBedId, transferredBy: req.user.id, reason });
  admission.bed = newBedId;
  await admission.save();

  res.json({ success: true, message: "Bed transfer completed.", data: admission });
});

exports.dischargePatient = asyncHandler(async (req, res) => {
  const admission = await IPDAdmission.findById(req.params.id);
  if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });
  if (admission.status === "discharged") return res.status(400).json({ success: false, message: "Patient already discharged." });

  admission.status = "discharged";
  admission.dischargeDate = new Date();
  admission.dischargeType = req.body.dischargeType || "normal";
  admission.dischargeSummary = req.body.dischargeSummary;

  // Free the bed
  if (admission.bed) {
    await Bed.findByIdAndUpdate(admission.bed, {
      status: "cleaning",
      currentAdmission: null, currentPatient: null, occupiedSince: null,
      $push: { occupancyHistory: { admission: admission._id, patient: admission.patient, admittedAt: admission.admissionDate, dischargedAt: new Date() } },
    });
  }

  await admission.save();
  res.json({ success: true, message: "Patient discharged successfully.", data: admission });
});

exports.updateAdmission = asyncHandler(async (req, res) => {
  const admission = await IPDAdmission.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });
  res.json({ success: true, data: admission });
});

exports.getMedicationNamesByPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  // 1️⃣ Get the admission for the patient
  const admission = await IPDAdmission.findOne({ patient: patientId });

  if (!admission) {
    return res.status(404).json({
      success: false,
      message: "No IPD admission found for this patient."
    });
  }

  // 2️⃣ Extract only medication names
  const medicationNames = admission.medicationOrders.map(med => med.name);

  return res.json({
    success: true,
    patientId,
    count: medicationNames.length,
    medications: medicationNames
  });
});