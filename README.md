# 🏥 Hospital Management System — Backend API v2

Complete REST API matching your full-stack frontend with **10 modules** and **80+ endpoints**.

---

## 📦 Tech Stack

| Tech | Purpose |
|---|---|
| **Node.js + Express** | Server & routing |
| **MongoDB + Mongoose** | Database |
| **JWT** | Authentication |
| **bcryptjs** | Password hashing |
| **Multer** | File/document uploads |
| **Helmet + CORS** | Security |
| **express-mongo-sanitize** | NoSQL injection prevention |
| **express-rate-limit** | Rate limiting |
| **Swagger / OpenAPI 3** | Interactive API docs |

---

## 🚀 Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit MONGO_URI and JWT_SECRET

# 3. Seed database
npm run seed

# 4. Start
npm run dev
```

Visit **http://localhost:5000/api-docs** for interactive Swagger docs.

---

## 🗂️ Project Structure

```
src/
├── config/
│   ├── db.js                 # MongoDB connection
│   └── swagger.js            # API documentation config
├── controllers/
│   ├── authController.js     # Auth & user management
│   ├── patientController.js  # Patient registry
│   ├── opdController.js      # OPD visits & consultations
│   ├── ipdController.js      # Admissions, MAR, discharge
│   ├── emergencyController.js# Emergency triage & cases
│   ├── bedController.js      # Bed management & analytics
│   ├── pharmacyController.js # Medicines, stock, suppliers
│   ├── labController.js      # Lab orders & results
│   ├── billingController.js  # Invoices & payments
│   ├── doctorController.js   # Doctor management
│   ├── staffController.js    # Staff management
│   ├── appointmentController.js # Appointment booking
│   └── dashboardController.js# Analytics & reports
├── middlewares/
│   ├── auth.js              # JWT protect + role authorize
│   ├── errorHandler.js      # Global error handler
│   └── upload.js            # Multer file uploads
├── models/
│   ├── User.js              # User accounts (all roles)
│   ├── Patient.js           # Patient registry
│   ├── Doctor.js            # Doctor profiles + schedule
│   ├── Staff.js             # Staff profiles
│   ├── OPDVisit.js          # OPD consultations + prescriptions
│   ├── IPDAdmission.js      # Admissions + MAR + dressing
│   ├── Emergency.js         # Emergency cases + triage
│   ├── Bed.js               # Beds + occupancy
│   ├── Medicine.js          # Inventory + suppliers
│   ├── Lab.js               # Lab tests catalog + orders
│   ├── Bill.js              # Invoices + payments
│   └── Appointment.js       # Appointments
├── routes/
│   ├── authRoutes.js
│   └── index.js             # All other module routes
└── utils/
    └── seeder.js            # Database seeder
```

---

## 🔐 Roles & Access

| Role | Access |
|---|---|
| `admin` | Full access to all modules |
| `doctor` | OPD, IPD, Lab orders, own schedule |
| `nurse` | Vitals, MAR, bed operations, stock |
| `receptionist` | Patients, appointments, billing, OPD registration |
| `pharmacist` | Pharmacy, stock management |
| `lab_technician` | Lab orders, results, sample collection |
| `patient` | Own records |

All protected routes require: `Authorization: Bearer <token>`

---

## 📡 API Reference — All 80+ Endpoints

### 🔑 Auth (`/api/v1/auth`)
| Method | Route | Description |
|---|---|---|
| POST | `/register` | Register user |
| POST | `/login` | Login → JWT |
| GET | `/me` | Current user |
| PUT | `/update-profile` | Update name/phone |
| PUT | `/change-password` | Change password |
| GET | `/users` | All users (admin) |
| PUT | `/users/:id/toggle` | Activate/deactivate |

### 👤 Patients (`/api/v1/patients`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List patients (paginated, filtered) |
| POST | `/` | Register patient |
| GET | `/search?q=` | Search by name/phone/ID |
| GET | `/:id` | Get patient |
| PUT | `/:id` | Update patient |
| DELETE | `/:id` | Deactivate patient |
| GET | `/:id/history` | OPD + IPD + billing history |
| POST | `/:id/documents` | Upload document |

### 🏥 OPD (`/api/v1/opd`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List visits |
| POST | `/` | Register OPD visit |
| GET | `/queue/today` | Today's queue (live) |
| GET | `/:id` | Visit details |
| PUT | `/:id` | Update visit |
| PUT | `/:id/vitals` | Record vitals |
| PUT | `/:id/prescription` | Save prescription |
| PUT | `/:id/status` | Update status |

### 🏨 IPD (`/api/v1/ipd`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List admissions |
| POST | `/` | Admit patient |
| GET | `/:id` | Admission details |
| PUT | `/:id` | Update admission |
| POST | `/:id/vitals` | Add vitals |
| POST | `/:id/notes` | Progress note |
| POST | `/:id/medications` | Medication order |
| POST | `/:id/medications/:orderId/administer` | MAR entry |
| POST | `/:id/dressing` | Dressing record |
| PUT | `/:id/transfer-bed` | Transfer bed |
| PUT | `/:id/discharge` | Discharge patient |

### 🚨 Emergency (`/api/v1/emergency`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | All cases |
| POST | `/` | New case |
| GET | `/stats` | Active case stats |
| GET | `/:id` | Case details |
| PUT | `/:id` | Update case |
| POST | `/:id/vitals` | Add vitals |
| PUT | `/:id/triage` | Update triage |
| POST | `/:id/notes` | Treatment note |
| PUT | `/:id/disposition` | Disposition (admit/discharge/transfer) |

### 🛏️ Beds (`/api/v1/beds`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List beds (filter by ward/type/status) |
| POST | `/` | Add bed |
| GET | `/analytics` | Occupancy analytics |
| GET | `/:id` | Bed details |
| PUT | `/:id` | Update bed |
| DELETE | `/:id` | Deactivate bed |
| PUT | `/:id/status` | Update status |

### 💊 Pharmacy (`/api/v1/pharmacy`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | List medicines |
| POST | `/` | Add medicine |
| GET | `/alerts` | Low stock + expiry alerts |
| GET | `/suppliers` | Suppliers |
| POST | `/suppliers` | Add supplier |
| PUT | `/suppliers/:id` | Update supplier |
| GET | `/:id` | Medicine details |
| PUT | `/:id` | Update medicine |
| POST | `/:id/stock/add` | Receive stock (purchase) |
| POST | `/:id/stock/dispense` | Dispense |
| POST | `/:id/stock/return` | Return |
| PUT | `/:id/stock/adjust` | Stock adjustment |

### 🔬 Laboratory (`/api/v1/lab`)
| Method | Route | Description |
|---|---|---|
| GET | `/tests` | Lab test catalog |
| POST | `/tests` | Add test |
| PUT | `/tests/:id` | Update test |
| GET | `/` | All orders |
| POST | `/` | Create lab order |
| GET | `/pending` | Pending orders |
| GET | `/:id` | Order details |
| PUT | `/:id/collect-sample` | Mark sample collected |
| POST | `/:id/results` | Enter results |
| PUT | `/:id/verify` | Verify results |

### 💰 Billing (`/api/v1/billing`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | All bills |
| POST | `/` | Create bill |
| GET | `/stats?period=` | Revenue stats |
| GET | `/:id` | Bill details |
| POST | `/:id/payment` | Record payment |
| POST | `/:id/items` | Add line item |
| PUT | `/:id/insurance` | Update insurance |
| PUT | `/:id/cancel` | Cancel bill |

### 👨‍⚕️ Doctors (`/api/v1/doctors`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | All doctors |
| POST | `/` | Add doctor |
| GET | `/slots?doctorId&date` | Available time slots |
| GET | `/:id` | Doctor profile |
| PUT | `/:id` | Update doctor |
| DELETE | `/:id` | Deactivate doctor |
| PUT | `/:id/availability` | Update schedule |
| GET | `/:id/stats` | Appointment stats |

### 👩‍💼 Staff (`/api/v1/staff`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | All staff |
| POST | `/` | Add staff |
| GET | `/by-department` | Grouped by dept |
| GET | `/:id` | Staff profile |
| PUT | `/:id` | Update staff |
| DELETE | `/:id` | Deactivate |

### 📅 Appointments (`/api/v1/appointments`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | All appointments |
| POST | `/` | Book appointment |
| GET | `/today` | Today's appointments |
| GET | `/:id` | Appointment details |
| PUT | `/:id` | Update |
| PUT | `/:id/cancel` | Cancel |

### 📊 Dashboard (`/api/v1/dashboard`)
| Method | Route | Description |
|---|---|---|
| GET | `/` | Full overview stats |
| GET | `/opd-report` | OPD report |
| GET | `/ipd-report` | IPD report (avg stay, etc.) |

---

## 🌱 Seeded Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@hospital.com | Admin@123 |
| Doctor (Cardiology) | dr.arun@hospital.com | Doctor@123 |
| Doctor (Pediatrics) | dr.sunita@hospital.com | Doctor@123 |
| Doctor (Orthopedics) | dr.vikram@hospital.com | Doctor@123 |
| Doctor (Gynecology) | dr.kavitha@hospital.com | Doctor@123 |
| Receptionist | reception@hospital.com | Staff@123 |
| Pharmacist | pharmacy@hospital.com | Staff@123 |
| Lab Technician | lab@hospital.com | Staff@123 |
| Nurse | nurse@hospital.com | Staff@123 |

Seeded data also includes: **5 patients**, **28 beds** (General/ICU/Private/Maternity/Emergency), **6 medicines**, **8 lab tests**, **1 supplier**.

---

## 🔑 Key Design Patterns

- **Auto-generated IDs**: PAT-2025-00001, OPD-202506-00001, IPD-2025-000001, etc.
- **Virtual fields**: `isLowStock`, `isExpired`, `age` computed dynamically
- **Full audit trails**: OPD visits track every action with performer + timestamp
- **Bed lifecycle**: available → occupied → cleaning → available (with full transfer history)
- **MAR (Medication Administration Record)**: Per-dose tracking on IPD medications
- **Soft deletes**: Nothing is hard-deleted — `isActive: false` pattern throughout
