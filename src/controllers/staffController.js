const Staff = require("../models/Staff");
const User = require("../models/User");
const { asyncHandler } = require("../middlewares/errorHandler");

exports.getStaff = asyncHandler(async (req, res) => {
  const { role, department, isActive = true, page = 1, limit = 20 } = req.query;
  const filter = { isActive };
  if (role) filter.role = role;
  if (department) filter.department = { $regex: department, $options: "i" };
  const [staff, total] = await Promise.all([
    Staff.find(filter).populate("user", "name email phone avatar").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit),
    Staff.countDocuments(filter),
  ]);
  res.json({ success: true, count: staff.length, total, data: staff });
});

exports.getStaffMember = asyncHandler(async (req, res) => {
  const member = await Staff.findById(req.params.id).populate("user", "name email phone avatar");
  if (!member) return res.status(404).json({ success: false, message: "Staff member not found." });
  res.json({ success: true, data: member });
});

exports.createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, phone, ...staffData } = req.body;
  const user = await User.create({ name, email, password, phone, role: staffData.role });
  try {
    const staff = await Staff.create({ user: user._id, ...staffData });
    await staff.populate("user", "name email phone");
    res.status(201).json({ success: true, data: staff });
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    throw err;
  }
});

exports.updateStaff = asyncHandler(async (req, res) => {
  const { name, phone, email, ...staffData } = req.body;
  const member = await Staff.findById(req.params.id);
  if (!member) return res.status(404).json({ success: false, message: "Staff member not found." });
  if (name || phone || email) await User.findByIdAndUpdate(member.user, { name, phone, email });
  const updated = await Staff.findByIdAndUpdate(req.params.id, staffData, { new: true }).populate("user", "name email phone");
  res.json({ success: true, data: updated });
});

exports.deleteStaff = asyncHandler(async (req, res) => {
  const member = await Staff.findById(req.params.id);
  if (!member) return res.status(404).json({ success: false, message: "Staff member not found." });
  await Promise.all([Staff.findByIdAndUpdate(req.params.id, { isActive: false }), User.findByIdAndUpdate(member.user, { isActive: false })]);
  res.json({ success: true, message: "Staff member deactivated." });
});

exports.getStaffByDepartment = asyncHandler(async (req, res) => {
  const grouped = await Staff.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$department", count: { $sum: 1 }, roles: { $push: "$role" } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, data: grouped });
});
