const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// const rateLimit = require('express-rate-limit');

dotenv.config();
const customerRoutes = require("./routes/customerRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const productRoutes = require("./routes/productRoutes");
const jobRoutes = require("./routes/jobRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const inventoryRoutes = require('./routes/inventoryRoutes');
const inventoryBatchRoutes = require('./routes/inventoryBatchRoutes');
const jobUsedInventoryRoutes = require('./routes/jobUsedInventoryRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');


const app = express();

// Rate limiting middleware
// const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100 // limit each IP to 100 requests per windowMs
// });
// app.use(limiter);

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Routes
app.use("/api/customers", customerRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/bookings", bookingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/inventoryBatch', inventoryBatchRoutes);
app.use('/api/jobUsedInventory', jobUsedInventoryRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/invoices', invoiceRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));