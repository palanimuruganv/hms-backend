// ── patients ──────────────────────────────────────────────────────────────────
const express = require("express");
const patientRouter = express.Router();
const pc = require("../controllers/patientController");
const { protect, authorize } = require("../middlewares/auth");
const { uploadSingle } = require("../middlewares/upload");

patientRouter.post("/register", pc.createPatient);
patientRouter.get("/search", protect, pc.searchPatients);
patientRouter.get("/:id/history", protect, pc.getPatientHistory);
patientRouter.route("/").get(protect, pc.getPatients).post(protect, authorize("admin", "receptionist", "doctor", "nurse"), pc.createPatient);
patientRouter.route("/:id").get(protect, pc.getPatient).put(protect, pc.updatePatient).delete(protect, authorize("admin"), pc.deletePatient);
patientRouter.post("/:id/documents", protect, uploadSingle("document", "patients"), pc.uploadDocument);

// ── OPD ───────────────────────────────────────────────────────────────────────
const opdRouter = express.Router();
const oc = require("../controllers/opdController");

opdRouter.post("/register", protect, authorize("admin", "receptionist", "doctor", "nurse"), oc.createVisit);
opdRouter.get("/queue/today", protect, oc.getTodayQueue);
opdRouter.route("/").get(protect, oc.getVisits).post(protect, authorize("admin", "receptionist", "doctor", "nurse"), oc.createVisit);
opdRouter.route("/:id").get(protect, oc.getVisit).put(protect, oc.updateVisit);
opdRouter.put("/:id/vitals", protect, authorize("admin", "doctor", "nurse"), oc.updateVitals);
opdRouter.put("/:id/prescription", protect, authorize("admin", "doctor"), oc.savePrescription);
opdRouter.put("/:id/status", protect, oc.updateStatus);

// ── IPD ───────────────────────────────────────────────────────────────────────
const ipdRouter = express.Router();
const ic = require("../controllers/ipdController");

ipdRouter.post("/register", protect, authorize("admin", "receptionist", "doctor"), ic.admitPatient);
ipdRouter.route("/").get(protect, ic.getAdmissions).post(protect, authorize("admin", "receptionist", "doctor"), ic.admitPatient);
ipdRouter.route("/:id").get(protect, ic.getAdmission).put(protect, ic.updateAdmission);
ipdRouter.post("/:id/vitals", protect, authorize("admin", "doctor", "nurse"), ic.addVitals);
ipdRouter.post("/:id/notes", protect, ic.addProgressNote);
ipdRouter.post("/:id/medications", protect, authorize("admin", "doctor"), ic.addMedicationOrder);
ipdRouter.post("/:id/medications/:orderId/administer", protect, authorize("admin", "nurse"), ic.recordMedAdministration);
ipdRouter.post("/:id/dressing", protect, authorize("admin", "doctor", "nurse"), ic.addDressingRecord);
ipdRouter.put("/:id/transfer-bed", protect, authorize("admin", "nurse"), ic.transferBed);
ipdRouter.put("/:id/discharge", protect, authorize("admin", "doctor"), ic.dischargePatient);
ipdRouter.get("/medications/:patientId", protect, authorize("doctor", "nurse"), ic.getMedicationNamesByPatient);
// ── Emergency ─────────────────────────────────────────────────────────────────
const emergencyRouter = express.Router();
const ec = require("../controllers/emergencyController");

emergencyRouter.get("/stats", protect, ec.getActiveStats);
emergencyRouter.route("/").get(protect, ec.getCases).post(protect, ec.createCase);
emergencyRouter.route("/:id").get(protect, ec.getCase).put(protect, ec.updateCase);
emergencyRouter.post("/:id/vitals", protect, ec.addVitals);
emergencyRouter.put("/:id/triage", protect, ec.updateTriage);
emergencyRouter.post("/:id/notes", protect, ec.addTreatmentNote);
emergencyRouter.put("/:id/disposition", protect, authorize("admin", "doctor"), ec.dispositionCase);

// ── Beds ──────────────────────────────────────────────────────────────────────
const bedRouter = express.Router();
const bc = require("../controllers/bedController");

bedRouter.post("/create", protect, authorize("admin", "nurse", "doctor"), bc.createBed);
bedRouter.route("/").get(protect, bc.getBeds).post(protect, authorize("admin"), bc.createBed);
bedRouter.route("/:id").get(protect, bc.getBed).put(protect, authorize("admin", "nurse"), bc.updateBed).delete(protect, authorize("admin"), bc.deleteBed);
bedRouter.put("/:id/status", protect, authorize("admin", "nurse"), bc.updateBedStatus);
bedRouter.post("/:id/update-status", protect, authorize("admin", "nurse","doctor"), bc.updateBedStatus);
bedRouter.get("/analytics/status", protect, authorize("admin"), bc.getBedAnalytics);
// ── Pharmacy ──────────────────────────────────────────────────────────────────
const pharmacyRouter = express.Router();
const phc = require("../controllers/pharmacyController");

pharmacyRouter.get("/alerts", protect, phc.getStockAlerts);
pharmacyRouter.route("/suppliers").get(protect, phc.getSuppliers).post(protect, authorize("admin", "pharmacist"), phc.createSupplier);
pharmacyRouter.route("/suppliers/:id").put(protect, authorize("admin", "pharmacist"), phc.updateSupplier).delete(protect, authorize("admin"), phc.deleteSupplier);
pharmacyRouter.route("/").get(protect, phc.getMedicines).post(protect, authorize("admin", "pharmacist"), phc.createMedicine);
pharmacyRouter.route("/:id").get(protect, phc.getMedicine).put(protect, authorize("admin", "pharmacist"), phc.updateMedicine).delete(protect, authorize("admin"), phc.deleteMedicine);
pharmacyRouter.post("/:id/stock/add", protect, authorize("admin", "pharmacist"), phc.addStock);
pharmacyRouter.post("/:id/stock/dispense", protect, authorize("admin", "pharmacist", "nurse"), phc.dispenseMedicine);
pharmacyRouter.post("/:id/stock/return", protect, authorize("admin", "pharmacist"), phc.returnMedicine);
pharmacyRouter.put("/:id/stock/adjust", protect, authorize("admin", "pharmacist"), phc.adjustStock);

// ── Laboratory ────────────────────────────────────────────────────────────────
const labRouter = express.Router();
const lc = require("../controllers/labController");

labRouter.get("/pending", protect, lc.getPendingOrders);
labRouter.route("/tests").get(protect, lc.getLabTests).post(protect, authorize("admin", "lab_technician"), lc.createLabTest);
labRouter.put("/tests/:id", protect, authorize("admin", "lab_technician"), lc.updateLabTest);
labRouter.route("/").get(protect, lc.getOrders).post(protect, authorize("admin", "doctor", "receptionist"), lc.createOrder);
labRouter.route("/:id").get(protect, lc.getOrder);
labRouter.put("/:id/collect-sample", protect, authorize("admin", "lab_technician", "nurse"), lc.collectSample);
labRouter.post("/:id/results", protect, authorize("admin", "lab_technician"), lc.enterResults);
labRouter.put("/:id/verify", protect, authorize("admin", "lab_technician"), lc.verifyResults);

// ── Billing ───────────────────────────────────────────────────────────────────
const billingRouter = express.Router();
const bic = require("../controllers/billingController");

billingRouter.get("/stats", protect, authorize("admin", "receptionist"), bic.getRevenueStats);
billingRouter.route("/").get(protect, bic.getBills).post(protect, authorize("admin", "receptionist"), bic.createBill);
billingRouter.route("/:id").get(protect, bic.getBill);
billingRouter.post("/:id/payment", protect, authorize("admin", "receptionist"), bic.recordPayment);
billingRouter.post("/:id/items", protect, authorize("admin", "receptionist"), bic.addLineItem);
billingRouter.put("/:id/insurance", protect, bic.updateInsurance);
billingRouter.put("/:id/cancel", protect, authorize("admin"), bic.cancelBill);

// ── Doctors ───────────────────────────────────────────────────────────────────
const doctorRouter = express.Router();
const dc = require("../controllers/doctorController");

doctorRouter.post("/register", protect, dc.createDoctor);
doctorRouter.get("/slots", protect, dc.getAvailableSlots);
doctorRouter.route("/").get(protect, dc.getDoctors).post(protect, authorize("admin"), dc.createDoctor);
doctorRouter.route("/:id").get(protect, dc.getDoctor).put(protect, authorize("admin", "doctor"), dc.updateDoctor).delete(protect, authorize("admin"), dc.deleteDoctor);
doctorRouter.put("/:id/availability", protect, authorize("admin", "doctor"), dc.updateAvailability);
doctorRouter.get("/:id/stats", protect, dc.getDoctorStats);

// ── Staff ─────────────────────────────────────────────────────────────────────
const staffRouter = express.Router();
const sc = require("../controllers/staffController");

staffRouter.get("/by-department", protect, sc.getStaffByDepartment);
staffRouter.route("/").get(protect, sc.getStaff).post(protect, authorize("admin"), sc.createStaff);
staffRouter.route("/:id").get(protect, sc.getStaffMember).put(protect, authorize("admin"), sc.updateStaff).delete(protect, authorize("admin"), sc.deleteStaff);

// ── Appointments ──────────────────────────────────────────────────────────────
const appointmentRouter = express.Router();
const ac = require("../controllers/appointmentController");

appointmentRouter.post("/book", protect, ac.bookAppointment);
appointmentRouter.get("/today", protect, ac.getTodayAppointments);
appointmentRouter.route("/").get(protect, ac.getAppointments).post(protect, ac.bookAppointment);
appointmentRouter.route("/:id").get(protect, ac.getAppointment).put(protect, ac.updateAppointment);
appointmentRouter.put("/:id/cancel", protect, ac.cancelAppointment);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const dashboardRouter = express.Router();
const dac = require("../controllers/dashboardController");

dashboardRouter.get("/", protect, authorize("admin", "receptionist"), dac.getDashboardStats);
dashboardRouter.get("/opd-report", protect, authorize("admin", "doctor", "receptionist"), dac.getOPDReport);
dashboardRouter.get("/ipd-report", protect, authorize("admin", "doctor", "receptionist"), dac.getIPDReport);

module.exports = {
  patientRouter, opdRouter, ipdRouter, emergencyRouter,
  bedRouter, pharmacyRouter, labRouter, billingRouter,
  doctorRouter, staffRouter, appointmentRouter, dashboardRouter,
};
