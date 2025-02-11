const express = require("express");
const db = require("../config/db");

const router = express.Router();

// Add a Job Linked to a Product and Customer
router.post("/add", async (req, res) => {
    try {
        const { product_id, customer_id, repair_description, repair_status, warranty_eligible, handover_date } = req.body;

        const [result] = await db.query(
            "INSERT INTO jobs (product_id, customer_id, repair_description, repair_status, warranty_eligible, handover_date) VALUES (?, ?, ?, ?, ?, ?)",
            [product_id, customer_id, repair_description, repair_status, warranty_eligible, handover_date]
        );

        res.status(201).json({ message: "Job added successfully!", job_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Jobs with Associated Products and Customers
router.get("/get", async (req, res) => {
    try {
        const [jobs] = await db.query(`
            SELECT jobs.*, products.product_name, products.model, products.product_image, customers.name AS customer_name
            FROM jobs
                     INNER JOIN products ON jobs.product_id = products.product_id
                     LEFT JOIN customers ON jobs.customer_id = customers.id
        `);
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;