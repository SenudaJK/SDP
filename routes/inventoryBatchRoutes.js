const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// Get all inventory batches
router.get('/getInventoryBatch', async (req, res) => {
    try {
        const [batches] = await db.query("SELECT * FROM InventoryBatch");
        res.status(200).json(batches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific inventory batch by BatchNo
router.get('/getInventoryBatch/:BatchNo', async (req, res) => {
    const { BatchNo } = req.params;
    try {
        const [batches] = await db.query("SELECT * FROM InventoryBatch WHERE BatchNo = ?", [BatchNo]);
        res.status(200).json(batches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new inventory batch
router.post(
    '/addBatch/:inventoryId',
    [
        body('Quantity')
            .isInt({ min: 1, max: 9999 }).withMessage('Quantity must be an integer between 1 and 9999'),
        body('Cost_Per_Item')
            .isFloat({ min: 1.00 }).withMessage('Cost per item must be a positive number'),
        body('Purchase_Date')
            .optional()
            .isISO8601().withMessage('Purchase date must be a valid date')
            .custom((value) => {
                const purchaseDate = new Date(value);
                const now = new Date();
                if (purchaseDate > now) {
                    throw new Error('Purchase date cannot be a future date');
                }
                return true;
            })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { inventoryId } = req.params;
        const { Quantity, Cost_Per_Item, Purchase_Date } = req.body;

        try {
            // Start a transaction
            await db.query('START TRANSACTION');

            // Insert into InventoryBatch
            const [result] = await db.query(
                "INSERT INTO InventoryBatch (Inventory_ID, Quantity, Cost_Per_Item, Purchase_Date) VALUES (?, ?, ?, ?)",
                [inventoryId, Quantity, Cost_Per_Item, Purchase_Date || new Date()]
            );

            const batchNo = result.insertId;
            const totalAmount = Quantity * Cost_Per_Item;

            // Insert into PurchaseItems
            await db.query(
                "INSERT INTO PurchaseItems (Inventory_ID, Batch_No, Quantity, Total_Amount, Purchase_Date) VALUES (?, ?, ?, ?, ?)",
                [inventoryId, batchNo, Quantity, totalAmount, Purchase_Date || new Date()]
            );

            // Commit the transaction
            await db.query('COMMIT');

            res.status(201).json({ message: "Inventory batch and purchase item added successfully!", id: batchNo });
        } catch (err) {
            // Rollback the transaction in case of error
            await db.query('ROLLBACK');
            res.status(500).json({ error: err.message });
        }
    }
);

// Update an existing inventory batch
router.put(
    '/updateBatch/:BatchNo',
    [
        body('Quantity')
            .isInt({ min: 1, max: 9999 }).withMessage('Quantity must be an integer between 1 and 9999'),
        body('Cost_Per_Item')
            .isFloat({ min: 1.00 }).withMessage('Cost per item must be a positive number'),
        body('Purchase_Date')
            .optional()
            .isISO8601().withMessage('Purchase date must be a valid date')
            .custom((value) => {
                const purchaseDate = new Date(value);
                const now = new Date();
                if (purchaseDate > now) {
                    throw new Error('Purchase date cannot be a future date');
                }
                return true;
            })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { BatchNo } = req.params;
        const { Quantity, Cost_Per_Item, Purchase_Date } = req.body;

        try {
            await db.query(
                "UPDATE InventoryBatch SET Quantity = ?, Cost_Per_Item = ?, Purchase_Date = ? WHERE BatchNo = ?",
                [Quantity, Cost_Per_Item, Purchase_Date || new Date(), BatchNo]
            );

            res.status(200).json({ message: "Inventory batch updated successfully!" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Delete an inventory batch
router.delete('/deleteBatch/:BatchNo', async (req, res) => {
    const { BatchNo } = req.params;
    try {
        await db.query("DELETE FROM InventoryBatch WHERE BatchNo = ?", [BatchNo]);
        res.status(200).json({ message: "Inventory batch deleted successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;