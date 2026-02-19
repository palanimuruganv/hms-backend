const { asyncHandler } = require("../middlewares/errorHandler");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Staff = require("../models/Staff");
const OPDVisit = require("../models/OPDVisit");
const IPDAdmission = require("../models/IPDAdmission");
const Emergency = require("../models/Emergency");
const Bed = require("../models/Bed");
const Bill = require("../models/Bill");
const Appointment = require("../models/Appointment");
const { LabOrder } = require("../models/Lab");
const { Medicine } = require("../models/Medicine");

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalPatients, newPatientsToday,
    totalDoctors, activeStaff,
    totalBeds, availableBeds, occupiedBeds,
    opdToday, opdThisMonth,
    ipdActive, ipdThisMonth,
    emergencyActive,
    pendingLabs,
    revenueToday, revenueMonth,
    pendingBills,
    lowStockMeds,
  ] = await Promise.all([
    Patient.countDocuments({ isActive: true }),
    Patient.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
    Doctor.countDocuments({ isAvailable: true }),
    Staff.countDocuments({ isActive: true }),
    Bed.countDocuments({ isActive: true }),
    Bed.countDocuments({ status: "available", isActive: true }),
    Bed.countDocuments({ status: "occupied", isActive: true }),
    OPDVisit.countDocuments({ visitDate: { $gte: today, $lt: tomorrow } }),
    OPDVisit.countDocuments({ visitDate: { $gte: monthStart } }),
    IPDAdmission.countDocuments({ status: { $in: ["admitted", "under-treatment", "stable", "critical"] } }),
    IPDAdmission.countDocuments({ admissionDate: { $gte: monthStart } }),
    Emergency.countDocuments({ status: { $in: ["active", "under-treatment"] } }),
    LabOrder.countDocuments({ status: { $in: ["pending", "in-progress"] } }),
    Bill.aggregate([{ $match: { status: "paid", createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
    Bill.aggregate([{ $match: { status: "paid", createdAt: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
    Bill.countDocuments({ status: { $in: ["generated", "partially-paid", "overdue"] } }),
    Medicine.countDocuments({ isActive: true, "stock.quantity": { $lte: 20 } }),
  ]);

  // OPD trend — last 7 days
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const opdTrend = await OPDVisit.aggregate([
    { $match: { visitDate: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$visitDate" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  // Revenue trend — last 30 days
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const revenueTrend = await Bill.aggregate([
    { $match: { status: "paid", createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$paidAmount" } } },
    { $sort: { _id: 1 } },
  ]);

  // Top specializations
  const topSpecializations = await Doctor.aggregate([
    { $group: { _id: "$specialization", count: { $sum: 1 } } },
    { $sort: { count: -1 } }, { $limit: 5 },
  ]);

  // Bed occupancy by ward
  const bedsByWard = await Bed.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$ward", total: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] } } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      overview: {
        patients: { total: totalPatients, newToday: newPatientsToday },
        doctors: { total: totalDoctors },
        staff: { total: activeStaff },
        beds: { total: totalBeds, available: availableBeds, occupied: occupiedBeds, occupancyRate: totalBeds > 0 ? `${((occupiedBeds / totalBeds) * 100).toFixed(1)}%` : "0%" },
        opd: { today: opdToday, thisMonth: opdThisMonth },
        ipd: { active: ipdActive, thisMonth: ipdThisMonth },
        emergency: { active: emergencyActive },
        lab: { pending: pendingLabs },
        revenue: { today: revenueToday[0]?.total || 0, thisMonth: revenueMonth[0]?.total || 0, pendingBills },
        pharmacy: { lowStock: lowStockMeds },
      },
      charts: { opdTrend, revenueTrend, topSpecializations, bedsByWard },
    },
  });
});

exports.getOPDReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, doctorId } = req.query;
  const filter = {};
  if (startDate) filter.visitDate = { $gte: new Date(startDate) };
  if (endDate) filter.visitDate = { ...filter.visitDate, $lte: new Date(new Date(endDate).setHours(23, 59, 59)) };
  if (doctorId) filter.doctor = doctorId;

  const [total, byStatus, byType, byDoctor] = await Promise.all([
    OPDVisit.countDocuments(filter),
    OPDVisit.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    OPDVisit.aggregate([{ $match: filter }, { $group: { _id: "$type", count: { $sum: 1 } } }]),
    OPDVisit.aggregate([
      { $match: filter },
      { $group: { _id: "$doctor", count: { $sum: 1 } } },
      { $lookup: { from: "doctors", localField: "_id", foreignField: "_id", as: "doctor" } },
      { $sort: { count: -1 } }, { $limit: 10 },
    ]),
  ]);

  res.json({ success: true, data: { total, byStatus, byType, byDoctor } });
});

exports.getIPDReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = {};
  if (startDate) filter.admissionDate = { $gte: new Date(startDate) };
  if (endDate) filter.admissionDate = { ...filter.admissionDate, $lte: new Date(new Date(endDate).setHours(23, 59, 59)) };

  const [total, active, discharged, avgStay] = await Promise.all([
    IPDAdmission.countDocuments(filter),
    IPDAdmission.countDocuments({ ...filter, status: { $in: ["admitted", "under-treatment", "stable", "critical"] } }),
    IPDAdmission.countDocuments({ ...filter, status: "discharged" }),
    IPDAdmission.aggregate([
      { $match: { ...filter, status: "discharged", dischargeDate: { $exists: true } } },
      { $project: { stayDays: { $divide: [{ $subtract: ["$dischargeDate", "$admissionDate"] }, 86400000] } } },
      { $group: { _id: null, avg: { $avg: "$stayDays" } } },
    ]),
  ]);

  res.json({ success: true, data: { total, active, discharged, averageStayDays: avgStay[0]?.avg?.toFixed(1) || 0 } });
});
