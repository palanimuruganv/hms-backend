const { LabOrder, LabTest } = require("../models/Lab");
const { asyncHandler } = require("../middlewares/errorHandler");

// ── Test Catalog ──────────────────────────────────────────────
exports.getLabTests = asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (search) filter.name = { $regex: search, $options: "i" };
  const tests = await LabTest.find(filter).sort({ name: 1 });
  res.json({ success: true, count: tests.length, data: tests });
});

exports.createLabTest = asyncHandler(async (req, res) => {
  const test = await LabTest.create(req.body);
  res.status(201).json({ success: true, data: test });
});

exports.updateLabTest = asyncHandler(async (req, res) => {
  const test = await LabTest.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!test) return res.status(404).json({ success: false, message: "Lab test not found." });
  res.json({ success: true, data: test });
});

// ── Orders ────────────────────────────────────────────────────
exports.getOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, status, patientId, date } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (patientId) filter.patient = patientId;
  if (date) {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    filter.createdAt = { $gte: d, $lt: next };
  }

  const [orders, total] = await Promise.all([
    LabOrder.find(filter)
      .populate("patient", "patientId name phone gender")
      .populate({ path: "orderedBy", populate: { path: "user", select: "name" } })
      .populate("tests.test", "name category price")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(+limit),
    LabOrder.countDocuments(filter),
  ]);
  res.json({ success: true, count: orders.length, total, pages: Math.ceil(total / limit), data: orders });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await LabOrder.findById(req.params.id)
    .populate("patient")
    .populate({ path: "orderedBy", populate: { path: "user", select: "name" } })
    .populate("tests.test")
    .populate("tests.processedBy", "name")
    .populate("tests.verifiedBy", "name");
  if (!order) return res.status(404).json({ success: false, message: "Lab order not found." });
  res.json({ success: true, data: order });
});

exports.createOrder = asyncHandler(async (req, res) => {
  const { patientId, orderedBy, tests, sourceType, sourceRef, notes } = req.body;

  // Calculate total
  const labTests = await LabTest.find({ _id: { $in: tests.map(t => t.test) } });
  const totalAmount = labTests.reduce((sum, t) => sum + t.price, 0);

  const order = await LabOrder.create({
    patient: patientId, orderedBy,
    tests: tests.map(t => ({ test: t.test, testName: t.testName, priority: t.priority || "routine" })),
    sourceType, sourceRef, totalAmount, notes,
    registeredBy: req.user.id,
  });

  await order.populate([
    { path: "patient", select: "patientId name phone" },
    { path: "tests.test", select: "name category" },
  ]);

  res.status(201).json({ success: true, data: order });
});

exports.collectSample = asyncHandler(async (req, res) => {
  const order = await LabOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });

  order.sampleCollected = true;
  order.sampleCollectedAt = new Date();
  order.sampleCollectedBy = req.user.id;
  order.sampleBarcode = req.body.barcode;
  order.status = "in-progress";
  order.tests = order.tests.map(t => ({ ...t.toObject(), status: "sample-collected" }));
  await order.save();
  res.json({ success: true, data: order });
});

exports.enterResults = asyncHandler(async (req, res) => {
  const { testId, results, reportNotes, resultFile } = req.body;
  const order = await LabOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });

  const test = order.tests.id(testId);
  if (!test) return res.status(404).json({ success: false, message: "Test not found in order." });

  test.results = results;
  test.reportNotes = reportNotes;
  test.resultFile = resultFile;
  test.status = "completed";
  test.processedBy = req.user.id;
  test.processedAt = new Date();

  // If all tests complete, mark order complete
  if (order.tests.every(t => t.status === "completed")) {
    order.status = "completed";
    order.reportReadyAt = new Date();
  }

  await order.save();
  res.json({ success: true, data: order });
});

exports.verifyResults = asyncHandler(async (req, res) => {
  const { testId } = req.body;
  const order = await LabOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });

  const test = order.tests.id(testId);
  if (!test) return res.status(404).json({ success: false, message: "Test not found." });
  test.verifiedBy = req.user.id;
  test.verifiedAt = new Date();
  await order.save();
  res.json({ success: true, message: "Results verified.", data: order });
});

exports.getPendingOrders = asyncHandler(async (req, res) => {
  const orders = await LabOrder.find({ status: { $in: ["pending", "in-progress"] } })
    .populate("patient", "patientId name")
    .populate("tests.test", "name")
    .sort({ createdAt: 1 });
  res.json({ success: true, count: orders.length, data: orders });
});
