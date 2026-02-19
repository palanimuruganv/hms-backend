# 💊 Pharmacy Module Documentation

## Overview
The Pharmacy module manages all pharmaceutical operations including medicine inventory, supplier management, stock transactions, and medication dispensing.

---

## 📊 Models

### **Medicine Model**
Tracks individual medicines with batch management and transactions.

**Fields:**
- `name` - Medicine name (required, unique key)
- `genericName` - Generic pharmaceutical name
- `brand` - Brand name
- `category` - Tablet, capsule, syrup, injection, cream, drops, inhaler, powder, solution, suppository, patch, other
- `composition` - Active ingredients
- `strength` - e.g., "500mg", "10mg/5ml"
- `unit` - Default: "units" (tablets, ml, vials)
- `manufacturer` - Manufacturing company
- `supplier` - Reference to Supplier document

**Stock Management:**
- `stock.quantity` - Current available quantity
- `stock.minThreshold` - Reorder level (default: 20)
- `stock.maxThreshold` - Maximum stock level
- `stock.location` - Rack/shelf location
- `batches` - Array of batch objects
  - `batchNumber` - Unique batch identifier
  - `quantity` - Units in this batch
  - `expiryDate` - Batch expiration date
  - `mrp` - Maximum Retail Price
  - `purchasePrice` - Cost per unit
  - `receivedDate` - When received

**Pricing:**
- `purchasePrice` - Cost per unit
- `sellingPrice` - Selling price
- `gstPercent` - GST rate (default: 0%)

**Compliance:**
- `requiresPrescription` - Boolean flag
- `isScheduledDrug` - Controlled drug flag
- `scheduleType` - H, H1, X (for scheduled drugs)
- `barcode` - For tracking
- `hsn` - HSN code for GST

**Transactions:**
Array of all stock movements:
- Type: `purchase`, `dispensed`, `returned`, `expired`, `adjustment`, `transfer`
- Quantity, batch number, reference ID, performed by, date, notes

**Virtual Fields:**
- `isLowStock` - Returns true if quantity ≤ minThreshold
- `isExpired` - Returns true if any batch is expired with quantity > 0

---

### **Supplier Model**
Manages medicine suppliers and vendors.

**Fields:**
- `name` - Supplier company name (required)
- `contactPerson` - Primary contact name
- `phone` - Contact number (required)
- `email` - Email address
- `address` - Supplier address
- `gstNumber` - GST registration
- `isActive` - Active/inactive flag (default: true)

---

## 🔌 API Endpoints

### **1. Medicine Management**

#### Get All Medicines
```
GET /api/v1/pharmacy/
```
**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search by name, generic name, or brand
- `category` - Filter by category
- `lowStock` - Show only low stock items (true/false)
- `expired` - Show only expired items (true/false)
- `requiresPrescription` - Filter by prescription requirement

**Response:**
```json
{
  "success": true,
  "count": 6,
  "total": 25,
  "data": [
    {
      "_id": "...",
      "name": "Paracetamol 500mg",
      "category": "tablet",
      "stock": { "quantity": 500, "minThreshold": 50 },
      "isLowStock": false,
      "isExpired": false
    }
  ]
}
```

---

#### Get Single Medicine
```
GET /api/v1/pharmacy/:id
```
**Response:** Complete medicine object with batches and transactions

---

#### Create Medicine
```
POST /api/v1/pharmacy/
```
**Required Fields:**
- `name` - Medicine name
- `category` - Valid category
- `strength` - e.g., "500mg"
- `manufacturer` - Manufacturer name
- `purchasePrice` - Cost per unit
- `sellingPrice` - Selling price

**Request Example:**
```json
{
  "name": "Ibuprofen 200mg",
  "genericName": "Ibuprofen",
  "brand": "Brufen",
  "category": "tablet",
  "strength": "200mg",
  "composition": "Ibuprofen 200mg",
  "manufacturer": "Cipla",
  "supplier": "507f1f77bcf86cd799439011",
  "purchasePrice": 1.5,
  "sellingPrice": 3,
  "gstPercent": 5,
  "requiresPrescription": false,
  "stock": {
    "quantity": 500,
    "minThreshold": 50,
    "maxThreshold": 2000,
    "location": "Rack A-2"
  }
}
```

---

#### Update Medicine
```
PUT /api/v1/pharmacy/:id
```
**Authorization:** admin, pharmacist

---

#### Delete Medicine
```
DELETE /api/v1/pharmacy/:id
```
**Effect:** Soft delete (marks `isActive` as false)

---

### **2. Stock Management**

#### Add Stock (Receive New Batch)
```
POST /api/v1/pharmacy/:id/stock/add
```
**Required Fields:**
- `quantity` - Units received
- `batchNumber` - Batch ID
- `expiryDate` - ISO date format
- `purchasePrice` - Cost per unit

**Optional:**
- `mrp` - Maximum Retail Price
- `notes` - Notes about the shipment

**Request:**
```json
{
  "quantity": 500,
  "batchNumber": "B2024001",
  "expiryDate": "2026-12-31",
  "mrp": 4,
  "purchasePrice": 2,
  "notes": "Received from warehouse"
}
```

**Response:** Updated medicine with new batch added and transaction logged

---

#### Dispense Medicine
```
POST /api/v1/pharmacy/:id/stock/dispense
```
**Used by:** Pharmacy, Nursing, Doctors during OPD/IPD

**Required Fields:**
- `quantity` - Units to dispense
- `referenceType` - "OPDVisit", "IPDAdmission", or "Bill"
- `referenceId` - The OPD/IPD/Bill document ID

**Optional:**
- `batchNumber` - Specific batch to dispense from
- `notes` - Dispensing notes

**Validations:**
- Checks stock availability
- Returns error if insufficient stock
- Logs transaction for auditing

---

#### Return Medicine
```
POST /api/v1/pharmacy/:id/stock/return
```
**Used by:** Pharmacy for returns and reversals

**Fields:**
- `quantity` - Units returned
- `batchNumber` - Batch number
- `referenceId` - Original document ID
- `reason` - Return reason (e.g., "Expired", "Damaged", "Patient refused")

---

#### Adjust Stock
```
PUT /api/v1/pharmacy/:id/stock/adjust
```
**Used by:** Pharmacist during physical inventory count

**Fields:**
- `newQuantity` - Correct quantity from physical count
- `reason` - Reason for adjustment (e.g., "Stock count correction", "Found damaged units")

**Effect:** Records the difference and logs transaction

---

### **3. Stock Alerts**

#### Get Stock Alerts
```
GET /api/v1/pharmacy/alerts
```
**Returns:**
- **Low Stock** - Items at or below minThreshold
- **Expired** - Items with expired batches still in stock
- **Expiring Soon** - Items expiring within 30 days

**Response:**
```json
{
  "success": true,
  "data": {
    "lowStock": {
      "count": 3,
      "items": [
        {
          "_id": "...",
          "name": "ORS Sachet",
          "stock": 15,
          "min": 20
        }
      ]
    },
    "expired": {
      "count": 0,
      "items": []
    },
    "expiringSoon": {
      "count": 2,
      "items": [
        {
          "_id": "...",
          "name": "Atorvastatin 10mg",
          "batches": [{ "batchNumber": "...", "expiryDate": "2025-03-15" }]
        }
      ]
    }
  }
}
```

---

### **4. Supplier Management**

#### Get All Suppliers
```
GET /api/v1/pharmacy/suppliers
```
**Returns:** List of active suppliers with contact info

---

#### Create Supplier
```
POST /api/v1/pharmacy/suppliers
```
**Required:**
- `name` - Supplier name
- `phone` - Contact number

**Optional:**
- `email`, `contactPerson`, `address`, `gstNumber`

---

#### Update Supplier
```
PUT /api/v1/pharmacy/suppliers/:id
```

---

#### Delete Supplier
```
DELETE /api/v1/pharmacy/suppliers/:id
```
**Effect:** Soft delete (marks `isActive` as false)

---

## 📋 Workflow Examples

### **1. Receiving New Stock from Supplier**
1. Supplier sends invoice/delivery note
2. **POST** `/pharmacy/:medicineId/stock/add`
   - Input: quantity, batch number, expiry date, purchase price
   - System updates stock quantity
   - Logs "purchase" transaction
   - Associates with supplier

### **2. Dispensing Medicine for OPD**
1. Doctor prescribes medicine in OPD visit
2. Pharmacy staff **POST** `/pharmacy/:medicineId/stock/dispense`
   - Input: quantity, referenceType="OPDVisit", referenceId=visitId
   - System reduces stock
   - Logs "dispensed" transaction
   - Links to OPD visit for audit trail

### **3. Handling Expired Medicine**
1. System identifies expired batches via `isExpired` flag
2. Staff **POST** `/pharmacy/:medicineId/stock/return`
   - Input: quantity, batch number, reason="Expired"
   - Logs "returned" transaction
   - Medicine can be written off

### **4. Physical Inventory Count**
1. Pharmacist counts all medicines
2. Compare with system quantity
3. If mismatch, **PUT** `/pharmacy/:medicineId/stock/adjust`
   - Input: newQuantity, reason="Stock count correction"
   - System calculates difference
   - Logs "adjustment" transaction

### **5. Get Low Stock Alerts**
1. Admin/Pharmacist **GET** `/pharmacy/alerts`
2. System returns three categories:
   - Medicines below minThreshold
   - Expired medicines still in stock
   - Medicines expiring within 30 days
3. Can place orders with suppliers

---

## 🔒 Authorization Levels

| Endpoint | Admin | Pharmacist | Nurse | Doctor | Receptionist |
|----------|-------|-----------|-------|--------|--------------|
| Get medicines | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create medicine | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update medicine | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete medicine | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add stock | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dispense medicine | ✅ | ✅ | ✅ | ❌ | ❌ |
| Return medicine | ✅ | ✅ | ❌ | ❌ | ❌ |
| Adjust stock | ✅ | ✅ | ❌ | ❌ | ❌ |
| Get alerts | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage suppliers | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 📊 Stock Transaction Tracking

Every stock movement creates a transaction record:
```javascript
{
  type: "dispensed",              // purchase/dispensed/returned/expired/adjustment/transfer
  quantity: 50,
  batchNumber: "B2024001",
  referenceType: "OPDVisit",      // Links to the clinical event
  referenceId: "507f...",
  performedBy: userId,
  date: "2026-02-18T10:30:00Z",
  notes: "Patient refuses"
}
```

This creates a complete audit trail for pharmaceutical compliance and cost analysis.

---

## 🚨 Key Features

✅ **Batch Management** - Track expiry dates, MRPs, purchase prices per batch  
✅ **Low Stock Alerts** - Configurable min/max thresholds  
✅ **Expiry Tracking** - Identify and manage expiring medicines  
✅ **Transaction Audit** - Complete history of all stock movements  
✅ **Supplier Linking** - Associate medicines with suppliers  
✅ **Prescription Tracking** - Flag controlled/prescribed-only medicines  
✅ **GST Management** - Store and calculate GST per medicine  
✅ **Multi-Location Support** - Track storage racks/shelf locations  
✅ **Stock Adjustment** - Reconcile with physical counts  
✅ **Compliance** - Full audit trail for regulatory requirements

---

## 🔍 Useful Queries

**Get all low stock medicines:**
```
GET /api/v1/pharmacy/?lowStock=true
```

**Get expired medicines:**
```
GET /api/v1/pharmacy/?expired=true
```

**Search for a medicine:**
```
GET /api/v1/pharmacy/?search=paracetamol
```

**Get medicines by category:**
```
GET /api/v1/pharmacy/?category=tablet
```

**Get all suppliers:**
```
GET /api/v1/pharmacy/suppliers
```

---

## 💡 Integration Points

- **OPD Module** - Dispense medicines when doctor prescribes
- **IPD Module** - MAR (Medication Administration Record) uses dispensed medicines
- **Billing Module** - Medicine costs included in bills
- **Emergency Module** - Quick medication dispensing for emergencies
- **Lab Module** - No direct integration but uses same audit framework

---

End of Pharmacy Module Documentation
