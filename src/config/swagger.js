const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "🏥 Hospital Management System API",
      version: "2.0.0",
      description: `
Full-featured Hospital Management REST API supporting:
- OPD (Outpatient), IPD (Inpatient), Emergency
- Pharmacy & Inventory, Laboratory
- Billing & Payments, Bed Management
- Doctors, Staff, Appointments, Patients
      `,
      contact: { name: "HMS Support", email: "support@hospital.com" },
    },
    servers: [
      { url: "http://localhost:5000/api/v1", description: "Development" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

module.exports = swaggerJsdoc(options);
