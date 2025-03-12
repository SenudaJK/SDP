const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/db');

// Get all inventory items
router.get('/getInventory', async (req, res) => {
    try {
        const [inventory] = await db.query("SELECT * FROM Inventory");
        res.status(200).json(inventory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a specific inventory item by ID
router.get('/getInventory/:Inventory_ID', async (req, res) => {
    const { Inventory_ID } = req.params;
    try {
        const [inventory] = await db.query("SELECT * FROM Inventory WHERE Inventory_ID = ?", [Inventory_ID]);
        res.status(200).json(inventory);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new inventory item
router.post(
    '/addInventory',
    [
        body('product_name')
            .isString().withMessage('Product name must be a string')
            .isLength({ min: 1 }).withMessage('Product name must not be empty'),
        body('stock_limit')
            .isInt({ min: 0 }).withMessage('Stock limit must be a non-negative integer')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { product_name, stock_limit } = req.body;

        try {
            const [result] = await db.query(
                "INSERT INTO Inventory (product_name, Stock_Limit) VALUES (?, ?)",
                [product_name, stock_limit]
            );

            res.status(201).json({ message: "Inventory item added successfully!", id: result.insertId });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Update an existing inventory item
router.put(
    '/updateInventory/:Inventory_ID',
    [
        body('product_name')
            .isString().withMessage('Product name must be a string')
            .isLength({ min: 1 }).withMessage('Product name must not be empty'),
        body('stock_limit')
            .isInt({ min: 0 }).withMessage('Stock limit must be a non-negative integer')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { Inventory_ID } = req.params;
        const { product_name, stock_limit } = req.body;

        try {
            await db.query(
                "UPDATE Inventory SET product_name = ?, Stock_Limit = ? WHERE Inventory_ID = ?",
                [product_name, stock_limit, Inventory_ID]
            );

            res.status(200).json({ message: "Inventory item updated successfully!" });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

// Check stock levels and notify if below limit
router.get('/checkStockLevels', async (req, res) => {
    try {
        const [inventory] = await db.query(
            `SELECT i.Inventory_ID, i.product_name, i.Stock_Limit, COALESCE(SUM(ib.Quantity), 0) as totalQuantity
             FROM Inventory i
             LEFT JOIN InventoryBatch ib ON i.Inventory_ID = ib.Inventory_ID
             GROUP BY i.Inventory_ID, i.product_name, i.Stock_Limit`
        );

        const outOfStockItems = inventory.filter(item => item.totalQuantity <= item.Stock_Limit);

        res.status(200).json(outOfStockItems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;