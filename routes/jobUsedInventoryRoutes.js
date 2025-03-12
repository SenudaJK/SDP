const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// Add used inventory for a job, inventory, and batch
router.post('/add/:jobId/:inventoryId/:batchNo', [
    body('Quantity_Used')
        .isInt({ min: 1 }).withMessage('Quantity Used must be a positive integer')
], async (req, res) => {
    const { jobId, inventoryId, batchNo } = req.params;
    const { Quantity_Used } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Retrieve the unit price and current quantity from the InventoryBatch table
        const [batch] = await db.query(
            "SELECT Cost_Per_Item, Quantity FROM InventoryBatch WHERE Inventory_ID = ? AND Batch_No = ?",
            [inventoryId, batchNo]
        );

        if (batch.length === 0) {
            return res.status(404).json({ message: "Inventory batch not found" });
        }

        const unitPrice = batch[0].Cost_Per_Item;
        const currentQuantity = batch[0].Quantity;

        if (Quantity_Used > currentQuantity) {
            return res.status(400).json({ message: "Insufficient inventory quantity" });
        }

        const Total_Amount = unitPrice * Quantity_Used;

        // Insert the data into the JobUsedInventory table
        const [result] = await db.query(
            "INSERT INTO JobUsedInventory (Job_ID, Inventory_ID, Batch_No, Quantity_Used, Total_Amount) VALUES (?, ?, ?, ?, ?)",
            [jobId, inventoryId, batchNo, Quantity_Used, Total_Amount]
        );

        // Update the quantity in the InventoryBatch table
        await db.query(
            "UPDATE InventoryBatch SET Quantity = Quantity - ? WHERE Inventory_ID = ? AND Batch_No = ?",
            [Quantity_Used, inventoryId, batchNo]
        );

        res.status(201).json({ message: "Job used inventory added successfully!", id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update used inventory for a job, inventory, and batch
router.put('/update/:jobId/:inventoryId/:batchNo', [
    body('Quantity_Used')
        .isInt({ min: 1 }).withMessage('Quantity Used must be a positive integer')
], async (req, res) => {
    const { jobId, inventoryId, batchNo } = req.params;
    const { Quantity_Used } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Retrieve the old quantity used from the JobUsedInventory table
        const [oldJobUsed] = await db.query(
            "SELECT Quantity_Used FROM JobUsedInventory WHERE Job_ID = ? AND Inventory_ID = ? AND Batch_No = ?",
            [jobId, inventoryId, batchNo]
        );

        if (oldJobUsed.length === 0) {
            return res.status(404).json({ message: "Job used inventory not found" });
        }

        const oldQuantityUsed = oldJobUsed[0].Quantity_Used;

        // Retrieve the unit price and current quantity from the InventoryBatch table
        const [batch] = await db.query(
            "SELECT Cost_Per_Item, Quantity FROM InventoryBatch WHERE Inventory_ID = ? AND Batch_No = ?",
            [inventoryId, batchNo]
        );

        if (batch.length === 0) {
            return res.status(404).json({ message: "Inventory batch not found" });
        }

        const unitPrice = batch[0].Cost_Per_Item;
        const currentQuantity = batch[0].Quantity;

        const quantityDifference = Quantity_Used - oldQuantityUsed;

        if (quantityDifference > currentQuantity) {
            return res.status(400).json({ message: "Insufficient inventory quantity" });
        }

        const Total_Amount = unitPrice * Quantity_Used;

        // Update the data in the JobUsedInventory table
        await db.query(
            "UPDATE JobUsedInventory SET Quantity_Used = ?, Total_Amount = ? WHERE Job_ID = ? AND Inventory_ID = ? AND Batch_No = ?",
            [Quantity_Used, Total_Amount, jobId, inventoryId, batchNo]
        );

        // Update the quantity in the InventoryBatch table
        await db.query(
            "UPDATE InventoryBatch SET Quantity = Quantity - ? WHERE Inventory_ID = ? AND Batch_No = ?",
            [quantityDifference, inventoryId, batchNo]
        );

        res.status(200).json({ message: "Job used inventory updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete used inventory for a job, inventory, and batch
router.delete('/delete/:jobId/:inventoryId/:batchNo', async (req, res) => {
    const { jobId, inventoryId, batchNo } = req.params;

    try {
        // Retrieve the quantity used from the JobUsedInventory table
        const [jobUsed] = await db.query(
            "SELECT Quantity_Used FROM JobUsedInventory WHERE Job_ID = ? AND Inventory_ID = ? AND Batch_No = ?",
            [jobId, inventoryId, batchNo]
        );

        if (jobUsed.length === 0) {
            return res.status(404).json({ message: "Job used inventory not found" });
        }

        const Quantity_Used = jobUsed[0].Quantity_Used;

        // Delete the data from the JobUsedInventory table
        await db.query(
            "DELETE FROM JobUsedInventory WHERE Job_ID = ? AND Inventory_ID = ? AND Batch_No = ?",
            [jobId, inventoryId, batchNo]
        );

        // Update the quantity in the InventoryBatch table
        await db.query(
            "UPDATE InventoryBatch SET Quantity = Quantity + ? WHERE Inventory_ID = ? AND Batch_No = ?",
            [Quantity_Used, inventoryId, batchNo]
        );

        res.status(200).json({ message: "Job used inventory deleted successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;