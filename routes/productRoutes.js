const express = require("express");
const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const { body, validationResult } = require("express-validator");

const router = express.Router();

const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Add a Product
router.post(
    "/add",
    upload.single("product_image"),
    [
        body("product_name")
            .notEmpty().withMessage("Product name is mandatory")
            .isLength({ max: 100 }).withMessage("Product name should not exceed 100 characters"),
        body("model")
            .notEmpty().withMessage("Model is mandatory")
            .isLength({ max: 50 }).withMessage("Model should not exceed 50 characters"),
        body("model_number")
            .notEmpty().withMessage("Model number is mandatory")
            .isLength({ max: 50 }).withMessage("Model number should not exceed 50 characters")
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { product_name, model, model_number } = req.body;
            const product_image = req.file ? `/uploads/${req.file.filename}` : null;

            const [result] = await db.query(
                "INSERT INTO products (product_name, model, model_number, product_image) VALUES (?, ?, ?, ?)",
                [product_name, model, model_number, product_image]
            );

            res.status(201).json({ message: "Product added successfully!", product_id: result.insertId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Get All Products
router.get("/get", async (req, res) => {
    try {
        const [products] = await db.query("SELECT * FROM products");
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;