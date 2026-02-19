const { Medicine, Supplier } = require("../models/Medicine");
const { asyncHandler } = require("../middlewares/errorHandler");

// ── Medicines ────────────────────────────────────────────────
exports.getMedicines = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, category, lowStock, expired, requiresPrescription } = req.query;
  const filter = { isActive: true };
  if (category) filter.category = category;
  if (requiresPrescription !== undefined) filter.requiresPrescription = requiresPrescription === "true";
  if (search) filter.$text = { $search: search };

  let medicines = await Medicine.find(filter)
    .populate("supplier", "name phone")
    .sort({ name: 1 })
    .skip((page - 1) * limit).limit(+limit);

  if (lowStock === "true") medicines = medicines.filter(m => m.isLowStock);
  if (expired === "true") medicines = medicines.filter(m => m.isExpired);

  const total = await Medicine.countDocuments(filter);
  res.json({ success: true, count: medicines.length, total, data: medicines });
});

exports.getMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id).populate("supplier", "name phone email");
  if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found." });
  res.json({ success: true, data: medicine });
});

exports.createMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.create(req.body);
  res.status(201).json({ success: true, data: medicine });
});

exports.updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found." });
  res.json({ success: true, data: medicine });
});

exports.deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found." });
  res.json({ success: true, message: "Medicine removed from inventory." });
});

// ── Stock Management ────────────────────────────────────────
exports.addStock = asyncHandler(async (req, res) => {
  const { quantity, batchNumber, expiryDate, mrp, purchasePrice } = req.body;
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found." });

  medicine.stock.quantity += quantity;
  medicine.batches.push({ batchNumber, quantity, expiryDate, mrp, purchasePrice });
  medicine.transactions.push({ type: "purchase", quantity, batchNumber, performedBy: req.user.id, notes: req.body.notes });
  await medicine.save();
  res.json({ success: true, message: `Stock added. New quantity: ${medicine.stock.quantity}`, data: medicine });
});

exports.dispenseMedicine = asyncHandler(async (req, res) => {
  const { quantity, referenceId, referenceType, batchNumber, notes } = req.body;
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found." });
  if (medicine.stock.quantity < quantity) {
    return res.status(400).json({ success: false, message: `Insufficient stock. Available: ${medicine.stock.quantity}` });
  }

  medicine.stock.quantity -= quantity;
  medicine.transactions.push({ type: "dispensed", quantity, batchNumber, referenceId, referenceType, performedBy: req.user.id, notes });
  await medicine.save();
  res.json({ success: true, message: "Medicine dispensed.", data: medicine });
});

exports.returnMedicine = asyncHandler(async (req, res) => {
  const { quantity, batchNumber, referenceId, reason } = req.body;
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found." });

  medicine.stock.quantity += quantity;
  medicine.transactions.push({ type: "returned", quantity, batchNumber, referenceId, performedBy: req.user.id, notes: reason });
  await medicine.save();
  res.json({ success: true, message: "Medicine returned to stock.", data: medicine });
});

exports.adjustStock = asyncHandler(async (req, res) => {
  const { newQuantity, reason } = req.body;
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found." });

  const diff = newQuantity - medicine.stock.quantity;
  medicine.transactions.push({ type: "adjustment", quantity: Math.abs(diff), performedBy: req.user.id, notes: `${diff >= 0 ? "+" : ""}${diff} — ${reason}` });
  medicine.stock.quantity = newQuantity;
  await medicine.save();
  res.json({ success: true, message: "Stock adjusted.", data: medicine });
});

// ── Alerts ───────────────────────────────────────────────────
exports.getStockAlerts = asyncHandler(async (req, res) => {
  const all = await Medicine.find({ isActive: true });
  const lowStock = all.filter(m => m.isLowStock);
  const expiredItems = all.filter(m => m.isExpired);
  const expiringSoon = all.filter(m => m.batches.some(b => {
    const days = (new Date(b.expiryDate) - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30 && b.quantity > 0;
  }));

  res.json({
    success: true,
    data: {
      lowStock: { count: lowStock.length, items: lowStock.map(m => ({ _id: m._id, name: m.name, stock: m.stock.quantity, min: m.stock.minThreshold })) },
      expired: { count: expiredItems.length, items: expiredItems.map(m => ({ _id: m._id, name: m.name })) },
      expiringSoon: { count: expiringSoon.length, items: expiringSoon.map(m => ({ _id: m._id, name: m.name, batches: m.batches.filter(b => { const d = (new Date(b.expiryDate) - Date.now()) / 86400000; return d > 0 && d <= 30; }) })) },
    },
  });
});

// ── Suppliers ────────────────────────────────────────────────
exports.getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, count: suppliers.length, data: suppliers });
});

exports.createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  res.status(201).json({ success: true, data: supplier });
});

exports.updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found." });
  res.json({ success: true, data: supplier });
});

exports.deleteSupplier = asyncHandler(async (req, res) => {
  await Supplier.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: "Supplier removed." });
});
