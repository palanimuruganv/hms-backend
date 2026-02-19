const Patient = require("../models/Patient");
const { asyncHandler } = require("../middlewares/errorHandler");

const paginate = (query, page, limit) =>
  query.skip((page - 1) * limit).limit(Number(limit));

exports.getPatients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, search, gender, bloodGroup, assignedDoctor } = req.query;
  const filter = { isActive: true };
  if (gender) filter.gender = gender;
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (assignedDoctor) filter.assignedDoctor = assignedDoctor;
  if (search) filter.$text = { $search: search };

  const [patients, total] = await Promise.all([
    paginate(
      Patient.find(filter)
        .populate("assignedDoctor", "doctorId specialization")
        .populate("registeredBy", "name")
        .sort({ createdAt: -1 }),
      page, limit
    ),
    Patient.countDocuments(filter),
  ]);

  res.json({ success: true, count: patients.length, total, pages: Math.ceil(total / limit), currentPage: +page, data: patients });
});

exports.getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .populate("assignedDoctor", "doctorId specialization")
    .populate("registeredBy", "name");
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });
  res.json({ success: true, data: patient });
});

exports.createPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.create({ ...req.body });
  res.status(201).json({ success: true, data: patient });
});

exports.updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });
  res.json({ success: true, data: patient });
});

exports.deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });
  res.json({ success: true, message: "Patient record deactivated." });
});

exports.uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });
  patient.documents.push({
    name: req.body.name || req.file.originalname,
    type: req.body.type || "other",
    url: req.file.path,
    uploadedBy: req.user.id,
  });
  await patient.save();
  res.json({ success: true, message: "Document uploaded.", data: patient.documents });
});

exports.searchPatients = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, message: "Query required." });
  const patients = await Patient.find({
    isActive: true,
    $or: [
      { name: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
      { patientId: { $regex: q, $options: "i" } },
    ],
  }).limit(20).select("patientId name phone gender dateOfBirth bloodGroup");
  res.json({ success: true, count: patients.length, data: patients });
});

exports.getPatientHistory = asyncHandler(async (req, res) => {
  const OPDVisit = require("../models/OPDVisit");
  const IPDAdmission = require("../models/IPDAdmission");
  const Bill = require("../models/Bill");
  const [opd, ipd, bills] = await Promise.all([
    OPDVisit.find({ patient: req.params.id }).populate("doctor", "doctorId specialization").sort({ visitDate: -1 }).limit(20),
    IPDAdmission.find({ patient: req.params.id }).populate("doctor", "doctorId specialization").populate("bed", "bedNumber ward").sort({ admissionDate: -1 }),
    Bill.find({ patient: req.params.id }).sort({ createdAt: -1 }).limit(20),
  ]);
  res.json({ success: true, data: { opd, ipd, bills } });
});
