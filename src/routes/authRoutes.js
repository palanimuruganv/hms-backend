// ─── src/routes/authRoutes.js ─────────────────────────────────────────────────
const express = require("express");
const r = express.Router();
const c = require("../controllers/authController");
const { protect, authorize } = require("../middlewares/auth");

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication & user management
 *   - name: Patients
 *     description: Patient registry
 *   - name: OPD
 *     description: Outpatient Department
 *   - name: IPD
 *     description: Inpatient Department
 *   - name: Emergency
 *     description: Emergency cases
 *   - name: Beds
 *     description: Bed management
 *   - name: Pharmacy
 *     description: Pharmacy & inventory
 *   - name: Laboratory
 *     description: Lab orders & results
 *   - name: Billing
 *     description: Bills & payments
 *   - name: Doctors
 *     description: Doctor management
 *   - name: Staff
 *     description: Staff management
 *   - name: Appointments
 *     description: Appointment booking
 *   - name: Dashboard
 *     description: Analytics & reports
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [admin, doctor, nurse, receptionist, pharmacist, lab_technician, patient] }
 *               phone: { type: string }
 *     responses:
 *       201: { description: User registered }
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful with JWT token }
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     responses:
 *       200: { description: Current user profile }
 */
r.post("/register", c.register);
r.post("/login", c.login);
r.get("/me", protect, c.getMe);
r.put("/update-profile", protect, c.updateProfile);
r.put("/change-password", protect, c.changePassword);
r.get("/users", protect, authorize("admin"), c.getUsers);
r.put("/users/:id/toggle", protect, authorize("admin"), c.toggleUserStatus);

module.exports = r;
