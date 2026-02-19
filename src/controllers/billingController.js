const Bill = require("../models/Bill");
const { asyncHandler } = require("../middlewares/errorHandler");

exports.getBills = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, status, billType, patientId, startDate, endDate } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (billType) filter.billType = billType;
  if (patientId) filter.patient = patientId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const [bills, total] = await Promise.all([
    Bill.find(filter)
      .populate("patient", "patientId name phone")
      .populate("generatedBy", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit),
    Bill.countDocuments(filter),
  ]);
  res.json({ success: true, count: bills.length, total, pages: Math.ceil(total / limit), data: bills });
});

exports.getBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id)
    .populate("patient")
    .populate("generatedBy", "name")
    .populate("approvedBy", "name");
  if (!bill) return res.status(404).json({ success: false, message: "Bill not found." });
  res.json({ success: true, data: bill });
});

exports.createBill = asyncHandler(async (req, res) => {
  const { patient, billType, sourceRef, sourceModel, items, discount, advanceDeposit, insurance, dueDate, notes } = req.body;

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalDiscount = discount || 0;
  const totalGST = items.reduce((sum, item) => {
    const base = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
    return sum + base * ((item.gstPercent || 0) / 100);
  }, 0);
  const totalAmount = subtotal - totalDiscount + totalGST;
  const netAmount = totalAmount - (advanceDeposit || 0);

  const bill = await Bill.create({
    patient, billType, sourceRef, sourceModel, items,
    subtotal, totalDiscount, totalGST, totalAmount,
    roundOff: Math.round(netAmount) - netAmount,
    netAmount: Math.round(netAmount),
    advanceDeposit: advanceDeposit || 0,
    balanceDue: Math.round(netAmount),
    insurance, dueDate, notes,
    status: "generated",
    generatedBy: req.user.id,
  });

  await bill.populate("patient", "patientId name phone");
  res.status(201).json({ success: true, data: bill });
});

exports.addLineItem = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: "Bill not found." });
  if (bill.status === "paid") return res.status(400).json({ success: false, message: "Cannot modify a paid bill." });
  bill.items.push(req.body);
  const base = req.body.quantity * req.body.unitPrice * (1 - (req.body.discount || 0) / 100);
  const gst = base * ((req.body.gstPercent || 0) / 100);
  bill.subtotal += base;
  bill.totalGST += gst;
  bill.totalAmount += base + gst;
  bill.netAmount = bill.totalAmount - bill.totalDiscount;
  bill.balanceDue = bill.netAmount - bill.paidAmount;
  await bill.save();
  res.json({ success: true, data: bill });
});

exports.recordPayment = asyncHandler(async (req, res) => {
  const { amount, method, transactionId, notes } = req.body;
  const bill = await Bill.findById(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: "Bill not found." });
  if (bill.status === "paid") return res.status(400).json({ success: false, message: "Bill is already fully paid." });

  bill.payments.push({ amount, method, transactionId, notes, receivedBy: req.user.id });
  bill.paidAmount += amount;
  bill.balanceDue = bill.netAmount - bill.paidAmount;
  bill.status = bill.paidAmount >= bill.netAmount ? "paid" : "partially-paid";
  await bill.save();
  res.json({ success: true, message: "Payment recorded.", data: bill });
});

exports.updateInsurance = asyncHandler(async (req, res) => {
  const bill = await Bill.findByIdAndUpdate(req.params.id, { insurance: req.body }, { new: true });
  if (!bill) return res.status(404).json({ success: false, message: "Bill not found." });
  res.json({ success: true, data: bill });
});

exports.cancelBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: "Bill not found." });
  if (bill.status === "paid") return res.status(400).json({ success: false, message: "Cannot cancel a paid bill." });
  bill.status = "cancelled";
  bill.notes = (bill.notes || "") + ` | Cancelled: ${req.body.reason || "No reason"}`;
  await bill.save();
  res.json({ success: true, message: "Bill cancelled.", data: bill });
});

exports.getRevenueStats = asyncHandler(async (req, res) => {
  const { period = "month" } = req.query;
  const now = new Date();
  let startDate;
  if (period === "today") { startDate = new Date(now.setHours(0, 0, 0, 0)); }
  else if (period === "week") { startDate = new Date(now.setDate(now.getDate() - 7)); }
  else if (period === "month") { startDate = new Date(now.setMonth(now.getMonth() - 1)); }
  else if (period === "year") { startDate = new Date(now.setFullYear(now.getFullYear() - 1)); }

  const [totalRevenue, byType, byStatus, dailyTrend, outstanding] = await Promise.all([
    Bill.aggregate([{ $match: { status: "paid", createdAt: { $gte: startDate } } }, { $group: { _id: null, total: { $sum: "$paidAmount" } } }]),
    Bill.aggregate([{ $match: { createdAt: { $gte: startDate } } }, { $group: { _id: "$billType", count: { $sum: 1 }, total: { $sum: "$netAmount" }, paid: { $sum: "$paidAmount" } } }]),
    Bill.aggregate([{ $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$netAmount" } } }]),
    Bill.aggregate([
      { $match: { status: "paid", createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$paidAmount" } } },
      { $sort: { _id: 1 } },
    ]),
    Bill.aggregate([{ $match: { status: { $in: ["generated", "partially-paid", "overdue"] } } }, { $group: { _id: null, total: { $sum: "$balanceDue" } } }]),
  ]);

  res.json({
    success: true,
    data: {
      totalRevenue: totalRevenue[0]?.total || 0,
      outstandingBalance: outstanding[0]?.total || 0,
      byType, byStatus, dailyTrend,
    },
  });
});
