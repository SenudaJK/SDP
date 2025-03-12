const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// Middleware to check if the user is an owner
const checkOwnerRole = async (req, res, next) => {
    const { ownerId } = req.body;
    try {
        const [owner] = await db.query("SELECT role FROM Employees WHERE id = ?", [ownerId]);
        if (owner.length === 0 || owner[0].role !== 'owner') {
            return res.status(403).json({ message: "Only owners can generate invoices" });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create an invoice
router.post('/create', [
    body('jobId').isInt().withMessage('Job ID must be an integer'),
    body('customerId').isInt().withMessage('Customer ID must be an integer'),
    body('ownerId').isInt().withMessage('Owner ID must be an integer'),
    body('advanceAmount').isFloat({ min: 0 }).withMessage('Advance Amount must be a positive number'),
    body('labourCost').isFloat({ min: 0 }).withMessage('Labour Cost must be a positive number')
], checkOwnerRole, async (req, res) => {
    const { jobId, customerId, ownerId, advanceAmount, labourCost } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Get the total cost for parts from JobUsedInventory
        const [totalCostForParts] = await db.query(
            "SELECT SUM(Total_Amount) as totalCost FROM JobUsedInventory WHERE Job_ID = ?",
            [jobId]
        );

        const totalCost = totalCostForParts[0].totalCost || 0;
        const totalAmount = totalCost + advanceAmount + labourCost;

        // Insert the invoice into the Invoice table
        const [result] = await db.query(
            "INSERT INTO Invoice (Job_ID, Customer_ID, Owner_ID, TotalCost_for_Parts, Advance_Amount, Labour_Cost, Total_Amount) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [jobId, customerId, ownerId, totalCost, advanceAmount, labourCost, totalAmount]
        );

        res.status(201).json({ message: "Invoice created successfully!", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get invoice details for a particular job
router.get('/details/:jobId', async (req, res) => {
    const { jobId } = req.params;

    try {
        const [invoice] = await db.query(
            "SELECT * FROM Invoice WHERE Job_ID = ?",
            [jobId]
        );

        if (invoice.length === 0) {
            return res.status(404).json({ message: "No invoice found for this job" });
        }

        res.status(200).json(invoice[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;