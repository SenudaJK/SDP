const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { body, validationResult } = require("express-validator");

const router = express.Router();

// Register Customer with Multiple Telephone Numbers
router.post(
    "/register",
    [
        body("firstName")
            .notEmpty().withMessage("First name is mandatory")
            .matches(/^[a-zA-Z']+$/).withMessage("First name should only contain letters and ' symbol")
            .isLength({ max: 10 }).withMessage("First name should not exceed 10 characters"),
        body("lastName")
            .notEmpty().withMessage("Last name is mandatory")
            .matches(/^[a-zA-Z']+$/).withMessage("Last name should only contain letters and ' symbol")
            .isLength({ max: 20 }).withMessage("Last name should not exceed 20 characters"),
        body("email")
            .notEmpty().withMessage("Email is mandatory")
            .isEmail().withMessage("Invalid email format")
            .isLength({ max: 100 }).withMessage("Email should not exceed 100 characters"),
        body("username")
            .notEmpty().withMessage("Username is mandatory")
            .isLength({ max: 50 }).withMessage("Username should not exceed 50 characters"),
        body("password")
            .notEmpty().withMessage("Password is mandatory")
            .isLength({ min: 8 }).withMessage("Password should be at least 8 characters long"),
        body("phoneNumbers")
            .isArray().withMessage("Phone numbers should be an array")
            .custom((phoneNumbers) => {
                for (let phone of phoneNumbers) {
                    if (!/^07\d{8}$/.test(phone)) {
                        throw new Error("Telephone number should contain 10 digits and start with 07");
                    }
                }
                return true;
            })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { firstName, lastName, email, username, password, phoneNumbers } = req.body;

            // Check if email or username exists
            const [existingUser] = await db.query(
                "SELECT * FROM customers WHERE email = ? OR username = ?",
                [email, username]
            );
            if (existingUser.length > 0) return res.status(400).json({ message: "Email or Username already exists" });

            for (let phone of phoneNumbers) {
                const [existingPhone] = await db.query(
                    "SELECT * FROM telephones WHERE phone_number = ?",
                    [phone]
                );
                if (existingPhone.length > 0) {
                    return res.status(400).json({ message: `Phone number ${phone} already exists` });
                }
            }



            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new customer
            const [result] = await db.query(
                "INSERT INTO customers (firstName, lastName, email, username, password) VALUES (?, ?, ?, ?, ?)",
                [firstName, lastName, email, username, hashedPassword]
            );

            const customerId = result.insertId;

            // Insert multiple phone numbers
            if (phoneNumbers && phoneNumbers.length > 0) {
                const phoneValues = phoneNumbers.map(phone => [customerId, phone]);
                await db.query("INSERT INTO telephones (customer_id, phone_number) VALUES ?", [phoneValues]);
            }

            res.status(201).json({ message: "Customer registered successfully!" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Update Customer
router.put(
    "/:id",
    [
        body("firstName")
            .notEmpty().withMessage("First name is mandatory")
            .matches(/^[a-zA-Z']+$/).withMessage("First name should only contain letters and ' symbol")
            .isLength({ max: 10 }).withMessage("First name should not exceed 10 characters"),
        body("lastName")
            .notEmpty().withMessage("Last name is mandatory")
            .matches(/^[a-zA-Z']+$/).withMessage("Last name should only contain letters and ' symbol")
            .isLength({ max: 20 }).withMessage("Last name should not exceed 20 characters"),
        body("email")
            .notEmpty().withMessage("Email is mandatory")
            .isEmail().withMessage("Invalid email format")
            .isLength({ max: 100 }).withMessage("Email should not exceed 100 characters"),
        body("username")
            .notEmpty().withMessage("Username is mandatory")
            .isLength({ max: 50 }).withMessage("Username should not exceed 50 characters"),
        body("password")
            .optional()
            .isLength({ min: 8 }).withMessage("Password should be at least 8 characters long"),
        body("phoneNumbers")
            .isArray().withMessage("Phone numbers should be an array")
            .custom((phoneNumbers) => {
                for (let phone of phoneNumbers) {
                    if (!/^07\d{8}$/.test(phone)) {
                        throw new Error("Telephone number should contain 10 digits and start with 07");
                    }
                }
                return true;
            })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { id } = req.params;
            const { firstName, lastName, email, username, password, phoneNumbers } = req.body;

            // Check if email or username exists for other customers
            const [existingUser] = await db.query(
                "SELECT * FROM customers WHERE (email = ? OR username = ?) AND id != ?",
                [email, username, id]
            );
            if (existingUser.length > 0) return res.status(400).json({ message: "Email or Username already exists" });

            // Hash password if provided
            let hashedPassword;
            if (password) {
                hashedPassword = await bcrypt.hash(password, 10);
            }

            // Update customer
            await db.query(
                "UPDATE customers SET firstName = ?, lastName = ?, email = ?, username = ?, password = ? WHERE id = ?",
                [firstName, lastName, email, username, hashedPassword || password, id]
            );

            // Update multiple phone numbers
            await db.query("DELETE FROM telephones WHERE customer_id = ?", [id]);
            if (phoneNumbers && phoneNumbers.length > 0) {
                const phoneValues = phoneNumbers.map(phone => [id, phone]);
                await db.query("INSERT INTO telephones (customer_id, phone_number) VALUES ?", [phoneValues]);
            }

            res.status(200).json({ message: "Customer updated successfully!" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Delete Customer
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM customers WHERE id = ?", [id]);
        await db.query("DELETE FROM telephones WHERE customer_id = ?", [id]);
        res.status(200).json({ message: "Customer deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

// Login Customer
router.post(
    "/login",
    [
        body("email")
            .notEmpty().withMessage("Email is mandatory")
            .isEmail().withMessage("Invalid email format"),
        body("password")
            .notEmpty().withMessage("Password is mandatory")
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { email, password } = req.body;

            // Check if email exists
            const [user] = await db.query("SELECT * FROM customers WHERE email = ?", [email]);
            if (user.length === 0) return res.status(400).json({ message: "Invalid email or password" });

            // Compare password
            const isMatch = await bcrypt.compare(password, user[0].password);
            if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

            res.status(200).json({ message: "Login successful" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
);

// Get All Customers
router.get("/all", async (req, res) => {
    try {
        const [customers] = await db.query(`
            SELECT c.id, c.firstName, c.lastName, c.email, GROUP_CONCAT(t.phone_number) AS phoneNumbers
            FROM customers c
                     LEFT JOIN telephones t ON c.id = t.customer_id
            GROUP BY c.id, c.firstName, c.lastName, c.email
        `);
        res.status(200).json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Specific Customer by ID
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [customer] = await db.query(`
            SELECT c.id, c.firstName, c.lastName, c.email, GROUP_CONCAT(t.phone_number) AS phoneNumbers
            FROM customers c
            LEFT JOIN telephones t ON c.id = t.customer_id
            WHERE c.id = ?
            GROUP BY c.id, c.firstName, c.lastName, c.email
        `, [id]);
        if (customer.length === 0) {
            return res.status(404).json({ message: "Customer not found" });
        }
        res.status(200).json(customer[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;