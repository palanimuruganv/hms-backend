const User = require("../models/User");
const { asyncHandler } = require("../middlewares/errorHandler");

const sendToken = (user, statusCode, res, message) => {
  const token = user.generateToken();
  const userObj = { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, avatar: user.avatar };
  res.status(statusCode).json({ success: true, message: message, token, user: userObj });
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Check if email exists
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Email already exists"
    });
  }

  const user = await User.create({ name, email, password, role, phone });
  
  sendToken(user, 201, res, "Registration successful"); 
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required." });
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid credentials." });
  }
  if (!user.isActive) return res.status(403).json({ success: false, message: "Account is deactivated." });
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  sendToken(user, 200, res, "Login successful");
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, data: user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(req.user.id, { name, phone }, { new: true, runValidators: true });
  res.json({ success: true, data: user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ success: false, message: "Current password is incorrect." });
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: "Password updated successfully." });
});

// Admin: Get all users
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, isActive = true } = req.query;
  const filter = { isActive };
  if (role) filter.role = role;
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, data: users });
});

exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found." });
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: `User ${user.isActive ? "activated" : "deactivated"}.`, data: user });
});
