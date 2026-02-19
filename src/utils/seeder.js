require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const User = require("../models/User");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Staff = require("../models/Staff");
const Bed = require("../models/Bed");
const { Medicine, Supplier } = require("../models/Medicine");
const { LabTest } = require("../models/Lab");

const seed = async () => {
  await connectDB();

  const isDestroy = process.argv.includes("--destroy");
  if (isDestroy) {
    const models = [User, Patient, Doctor, Staff, Bed, Medicine, Supplier, LabTest];
    await Promise.all(models.map(m => m.deleteMany({})));
    console.log("🗑️  All data cleared.");
    process.exit(0);
  }

  try {
    // ── Clear ───────────────────────────────────────
    await Promise.all([User, Patient, Doctor, Staff, Bed, Medicine, Supplier, LabTest].map(m => m.deleteMany({})));
    console.log("🗑️  Cleared existing data...");

    // ── Admin ───────────────────────────────────────
    const admin = await User.create({ name: "System Admin", email: "admin@hospital.com", password: "Admin@123", role: "admin", phone: "+91-9000000001" });

    // ── Receptionist ─────────────────────────────────
    const reception = await User.create({ name: "Riya Sharma", email: "reception@hospital.com", password: "Staff@123", role: "receptionist", phone: "+91-9000000010" });
    await Staff.create({ user: reception._id, designation: "Senior Receptionist", department: "Front Desk", role: "receptionist", shift: "morning", employmentType: "full-time" });

    // ── Pharmacist ───────────────────────────────────
    const pharmaUser = await User.create({ name: "Kiran Patel", email: "pharmacy@hospital.com", password: "Staff@123", role: "pharmacist", phone: "+91-9000000020" });
    await Staff.create({ user: pharmaUser._id, designation: "Chief Pharmacist", department: "Pharmacy", role: "pharmacist", shift: "morning", employmentType: "full-time" });

    // ── Lab Tech ─────────────────────────────────────
    const labUser = await User.create({ name: "Meena Joshi", email: "lab@hospital.com", password: "Staff@123", role: "lab_technician", phone: "+91-9000000030" });
    await Staff.create({ user: labUser._id, designation: "Lab Technician", department: "Laboratory", role: "lab_technician", shift: "morning", employmentType: "full-time" });

    // ── Nurse ────────────────────────────────────────
    const nurseUser = await User.create({ name: "Priya Nair", email: "nurse@hospital.com", password: "Staff@123", role: "nurse", phone: "+91-9000000040" });
    await Staff.create({ user: nurseUser._id, designation: "Head Nurse", department: "General Ward", role: "nurse", shift: "morning", employmentType: "full-time" });

    // ── Doctors ──────────────────────────────────────
    const doctorUsers = await User.create([
      { name: "Dr. Arun Mehta",    email: "dr.arun@hospital.com",    password: "Doctor@123", role: "doctor", phone: "+91-9100000001" },
      { name: "Dr. Sunita Rao",    email: "dr.sunita@hospital.com",   password: "Doctor@123", role: "doctor", phone: "+91-9100000002" },
      { name: "Dr. Vikram Singh",  email: "dr.vikram@hospital.com",   password: "Doctor@123", role: "doctor", phone: "+91-9100000003" },
      { name: "Dr. Kavitha Nair",  email: "dr.kavitha@hospital.com",  password: "Doctor@123", role: "doctor", phone: "+91-9100000004" },
    ]);

    await Doctor.create([
      {
        user: doctorUsers[0]._id, specialization: "Cardiology", department: "Cardiac Care",
        licenseNumber: "MCI-CAR-001", experience: 15, consultationFee: 800, opdEnabled: true, ipdEnabled: true,
        bio: "15+ years in interventional cardiology.",
        qualifications: [{ degree: "MD (Cardiology)", institution: "AIIMS Delhi", year: 2008 }],
        availability: [
          { day: "Monday", startTime: "09:00", endTime: "13:00", maxAppointments: 16 },
          { day: "Wednesday", startTime: "09:00", endTime: "13:00", maxAppointments: 16 },
          { day: "Friday", startTime: "14:00", endTime: "18:00", maxAppointments: 16 },
        ],
      },
      {
        user: doctorUsers[1]._id, specialization: "Pediatrics", department: "Pediatrics",
        licenseNumber: "MCI-PED-002", experience: 10, consultationFee: 600, opdEnabled: true,
        bio: "Specialist in child health and neonatology.",
        qualifications: [{ degree: "MD (Pediatrics)", institution: "CMC Vellore", year: 2013 }],
        availability: [
          { day: "Tuesday", startTime: "10:00", endTime: "17:00", maxAppointments: 20 },
          { day: "Thursday", startTime: "10:00", endTime: "17:00", maxAppointments: 20 },
          { day: "Saturday", startTime: "09:00", endTime: "13:00", maxAppointments: 10 },
        ],
      },
      {
        user: doctorUsers[2]._id, specialization: "Orthopedics", department: "Orthopedics",
        licenseNumber: "MCI-ORT-003", experience: 12, consultationFee: 700, opdEnabled: true, ipdEnabled: true,
        qualifications: [{ degree: "MS (Orthopedics)", institution: "PGIMER Chandigarh", year: 2011 }],
        availability: [
          { day: "Monday", startTime: "14:00", endTime: "18:00", maxAppointments: 16 },
          { day: "Wednesday", startTime: "14:00", endTime: "18:00", maxAppointments: 16 },
          { day: "Friday", startTime: "09:00", endTime: "13:00", maxAppointments: 16 },
        ],
      },
      {
        user: doctorUsers[3]._id, specialization: "Gynecology", department: "Maternity",
        licenseNumber: "MCI-GYN-004", experience: 8, consultationFee: 700, opdEnabled: true, ipdEnabled: true,
        qualifications: [{ degree: "MS (Obs & Gynae)", institution: "KEM Mumbai", year: 2015 }],
        availability: [
          { day: "Tuesday", startTime: "09:00", endTime: "13:00", maxAppointments: 16 },
          { day: "Thursday", startTime: "09:00", endTime: "13:00", maxAppointments: 16 },
          { day: "Saturday", startTime: "10:00", endTime: "14:00", maxAppointments: 12 },
        ],
      },
    ]);

    // ── Patients ─────────────────────────────────────
    await Patient.create([
      { name: "Rajesh Kumar",   phone: "9876543210", dateOfBirth: new Date("1978-05-12"), gender: "male",   bloodGroup: "B+", address: { city: "Mumbai", state: "Maharashtra" }, allergies: ["Penicillin"], chronicConditions: ["Hypertension"] },
      { name: "Sunita Devi",    phone: "9876543211", dateOfBirth: new Date("1985-09-22"), gender: "female", bloodGroup: "O+", address: { city: "Pune", state: "Maharashtra" },   emergencyContact: { name: "Ramesh Devi", relationship: "husband", phone: "9876543299" } },
      { name: "Amar Joshi",     phone: "9876543212", dateOfBirth: new Date("1992-01-30"), gender: "male",   bloodGroup: "A+", address: { city: "Delhi", state: "Delhi" } },
      { name: "Rekha Sharma",   phone: "9876543213", dateOfBirth: new Date("1967-11-08"), gender: "female", bloodGroup: "AB+", chronicConditions: ["Diabetes", "Arthritis"] },
      { name: "Manoj Gupta",    phone: "9876543214", dateOfBirth: new Date("2005-03-15"), gender: "male",   bloodGroup: "O-", address: { city: "Bangalore", state: "Karnataka" } },
    ]);

    // ── Beds ─────────────────────────────────────────
    const bedData = [
      // General Ward
      ...Array.from({ length: 10 }, (_, i) => ({ bedNumber: `GW-${String(i+1).padStart(3,"0")}`, ward: "General Ward", floor: "Ground", type: "general", dailyRate: 500 })),
      // ICU
      ...Array.from({ length: 5 }, (_, i) => ({ bedNumber: `ICU-${String(i+1).padStart(3,"0")}`, ward: "ICU", floor: "2nd Floor", type: "icu", dailyRate: 5000, features: ["ventilator", "monitor", "oxygen"] })),
      // Private Rooms
      ...Array.from({ length: 5 }, (_, i) => ({ bedNumber: `PR-${String(i+1).padStart(3,"0")}`, ward: "Private", floor: "3rd Floor", type: "private", dailyRate: 2000, room: `30${i+1}` })),
      // Maternity
      ...Array.from({ length: 4 }, (_, i) => ({ bedNumber: `MAT-${String(i+1).padStart(3,"0")}`, ward: "Maternity", floor: "1st Floor", type: "maternity", dailyRate: 1500 })),
      // Emergency
      ...Array.from({ length: 4 }, (_, i) => ({ bedNumber: `EM-${String(i+1).padStart(3,"0")}`, ward: "Emergency", floor: "Ground", type: "emergency", dailyRate: 1000 })),
    ];
    await Bed.insertMany(bedData);

    // ── Supplier ─────────────────────────────────────
    const supplier = await Supplier.create({ name: "MedSupply India Pvt. Ltd.", contactPerson: "Anand Shah", phone: "9988776655", email: "supply@medsupply.in", gstNumber: "27AABCU9603R1ZX" });

    // ── Medicines ─────────────────────────────────────
    await Medicine.create([
      { name: "Paracetamol 500mg", genericName: "Acetaminophen", category: "tablet", strength: "500mg", manufacturer: "Cipla", supplier: supplier._id, stock: { quantity: 500, minThreshold: 50 }, batches: [{ batchNumber: "B2024001", quantity: 500, expiryDate: new Date("2026-12-31"), mrp: 2, purchasePrice: 1 }], purchasePrice: 1, sellingPrice: 2, requiresPrescription: false },
      { name: "Amoxicillin 250mg", genericName: "Amoxicillin", category: "capsule", strength: "250mg", manufacturer: "Sun Pharma", supplier: supplier._id, stock: { quantity: 200, minThreshold: 30 }, batches: [{ batchNumber: "B2024002", quantity: 200, expiryDate: new Date("2026-06-30"), mrp: 8, purchasePrice: 5 }], purchasePrice: 5, sellingPrice: 8, requiresPrescription: true },
      { name: "Metformin 500mg", genericName: "Metformin HCl", category: "tablet", strength: "500mg", manufacturer: "Abbott", supplier: supplier._id, stock: { quantity: 300, minThreshold: 50 }, batches: [{ batchNumber: "B2024003", quantity: 300, expiryDate: new Date("2026-09-30"), mrp: 5, purchasePrice: 3 }], purchasePrice: 3, sellingPrice: 5, requiresPrescription: true },
      { name: "Atorvastatin 10mg", genericName: "Atorvastatin", category: "tablet", strength: "10mg", manufacturer: "Dr. Reddy's", supplier: supplier._id, stock: { quantity: 150, minThreshold: 25 }, batches: [{ batchNumber: "B2024004", quantity: 150, expiryDate: new Date("2025-12-31"), mrp: 12, purchasePrice: 8 }], purchasePrice: 8, sellingPrice: 12, requiresPrescription: true },
      { name: "Normal Saline 500ml", genericName: "Sodium Chloride 0.9%", category: "injection", strength: "0.9%/500ml", manufacturer: "Baxter", supplier: supplier._id, stock: { quantity: 50, minThreshold: 20 }, batches: [{ batchNumber: "B2024005", quantity: 50, expiryDate: new Date("2026-03-31"), mrp: 45, purchasePrice: 30 }], purchasePrice: 30, sellingPrice: 45, requiresPrescription: true },
      { name: "ORS Sachet", genericName: "Oral Rehydration Salts", category: "powder", manufacturer: "WHO-ORS", supplier: supplier._id, stock: { quantity: 15, minThreshold: 20 }, batches: [{ batchNumber: "B2024006", quantity: 15, expiryDate: new Date("2025-08-31"), mrp: 5, purchasePrice: 3 }], purchasePrice: 3, sellingPrice: 5, requiresPrescription: false },
    ]);

    // ── Lab Tests ─────────────────────────────────────
    await LabTest.create([
      { name: "Complete Blood Count (CBC)", code: "CBC", category: "hematology", price: 250, sampleType: "blood", turnaroundTime: "4 hours", parameters: [{ name: "Hemoglobin", unit: "g/dL", normalRange: { male: { min: 13.5, max: 17.5 }, female: { min: 12, max: 15.5 } } }, { name: "WBC Count", unit: "cells/μL", normalRange: { male: { min: 4500, max: 11000 }, female: { min: 4500, max: 11000 } } }] },
      { name: "Blood Glucose (Fasting)", code: "FBS", category: "biochemistry", price: 80, sampleType: "blood", turnaroundTime: "2 hours", parameters: [{ name: "Glucose", unit: "mg/dL", normalRange: { male: { min: 70, max: 100 }, female: { min: 70, max: 100 } } }] },
      { name: "Lipid Profile", code: "LIPID", category: "biochemistry", price: 350, sampleType: "blood", turnaroundTime: "4 hours", parameters: [{ name: "Total Cholesterol", unit: "mg/dL" }, { name: "HDL", unit: "mg/dL" }, { name: "LDL", unit: "mg/dL" }, { name: "Triglycerides", unit: "mg/dL" }] },
      { name: "Urine Routine", code: "UR", category: "urine", price: 100, sampleType: "urine", turnaroundTime: "2 hours" },
      { name: "Thyroid Profile (TSH/T3/T4)", code: "TFT", category: "biochemistry", price: 500, sampleType: "blood", turnaroundTime: "6 hours" },
      { name: "HbA1c", code: "HBA1C", category: "biochemistry", price: 400, sampleType: "blood", turnaroundTime: "4 hours", parameters: [{ name: "HbA1c", unit: "%", normalRange: { male: { min: 4, max: 5.6 }, female: { min: 4, max: 5.6 } } }] },
      { name: "COVID-19 Antigen Test", code: "COVID-AG", category: "serology", price: 300, sampleType: "swab", turnaroundTime: "30 minutes" },
      { name: "Chest X-Ray", code: "CXR", category: "radiology", price: 300, sampleType: "other", turnaroundTime: "1 hour" },
    ]);

    console.log(`
╔══════════════════════════════════════════════════════╗
║         ✅ Database Seeded Successfully!             ║
╠══════════════════════════════════════════════════════╣
║  ROLE            EMAIL                    PASSWORD   ║
║  ─────────────── ──────────────────────── ───────── ║
║  Admin           admin@hospital.com       Admin@123  ║
║  Doctor (Cardio) dr.arun@hospital.com     Doctor@123 ║
║  Doctor (Peds)   dr.sunita@hospital.com   Doctor@123 ║
║  Doctor (Ortho)  dr.vikram@hospital.com   Doctor@123 ║
║  Doctor (Gynae)  dr.kavitha@hospital.com  Doctor@123 ║
║  Receptionist    reception@hospital.com   Staff@123  ║
║  Pharmacist      pharmacy@hospital.com    Staff@123  ║
║  Lab Technician  lab@hospital.com         Staff@123  ║
║  Nurse           nurse@hospital.com       Staff@123  ║
╠══════════════════════════════════════════════════════╣
║  Seeded: 4 Doctors · 5 Patients · 28 Beds           ║
║          6 Medicines · 8 Lab Tests · 1 Supplier      ║
╚══════════════════════════════════════════════════════╝
    `);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
