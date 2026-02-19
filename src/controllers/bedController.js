const Bed = require("../models/Bed");
const { asyncHandler } = require("../middlewares/errorHandler");

exports.getBeds = asyncHandler(async (req, res) => {
  const { ward, type, status, floor } = req.query;
  const filter = { isActive: true };
  if (ward) filter.ward = { $regex: ward, $options: "i" };
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (floor) filter.floor = floor;

  const beds = await Bed.find(filter)
    .populate("currentPatient", "patientId name gender phone")
    .populate({ path: "currentAdmission", select: "admissionDate status admissionDiagnosis" })
    .sort({ ward: 1, bedNumber: 1 });

  res.json({ success: true, count: beds.length, data: beds });
});

exports.getBed = asyncHandler(async (req, res) => {
  const bed = await Bed.findById(req.params.id)
    .populate("currentPatient")
    .populate("currentAdmission");
  if (!bed) return res.status(404).json({ success: false, message: "Bed not found." });
  res.json({ success: true, data: bed });
});

exports.createBed = asyncHandler(async (req, res) => {
  const bed = await Bed.create(req.body);
  res.status(201).json({ success: true, data: bed });
});

exports.updateBed = asyncHandler(async (req, res) => {
  const bed = await Bed.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!bed) return res.status(404).json({ success: false, message: "Bed not found." });
  res.json({ success: true, data: bed });
});

exports.deleteBed = asyncHandler(async (req, res) => {
  const bed = await Bed.findById(req.params.id);
  if (!bed) return res.status(404).json({ success: false, message: "Bed not found." });
  if (bed.status === "occupied") return res.status(400).json({ success: false, message: "Cannot delete an occupied bed." });
  bed.isActive = false;
  await bed.save();
  res.json({ success: true, message: "Bed deactivated." });
});

exports.updateBedStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const bed = await Bed.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!bed) return res.status(404).json({ success: false, message: "Bed not found." });
  res.json({ success: true, data: bed });
});

exports.getBedAnalytics = asyncHandler(async (req, res) => {
  const [all, byStatus, byWard, byType] = await Promise.all([
    Bed.countDocuments({ isActive: true }),
    Bed.aggregate([{ $match: { isActive: true } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Bed.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$ward", total: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] } }, available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    Bed.aggregate([{ $match: { isActive: true } }, { $group: { _id: "$type", count: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] } } } }]),
  ]);

  const occupied = byStatus.find(s => s._id === "occupied")?.count || 0;
  const available = byStatus.find(s => s._id === "available")?.count || 0;
  const occupancyRate = all > 0 ? ((occupied / all) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    data: { total: all, occupied, available, occupancyRate: `${occupancyRate}%`, byStatus, byWard, byType },
  });
});
