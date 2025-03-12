const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Calculate salary for part-time employees
router.post('/calculatePartTimeSalary/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const { cost } = req.body;

    if (!cost || isNaN(cost)) {
        return res.status(400).json({ error: 'Invalid cost provided' });
    }

    try {
        const employeeSalary = cost * 0.40; // 40% of the cost goes to the part-time employee
        const ownerSalary = cost * 0.60; // 60% of the cost goes to the owner

        // Update owner's salary
        // await db.query("UPDATE Employees SET Salary = Salary + ? WHERE role = 'owner'", [ownerSalary]);

        // Insert salary record for the employee
        await db.query(
            "INSERT INTO Salary (Employee_ID, Payment_Date, Total_Salary) VALUES (?, ?, ?)",
            [employeeId, new Date(), employeeSalary]
        );

        res.status(200).json({ employeeId, employeeSalary, ownerSalary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/calculateFullTimeSalary/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    try {
        const [employee] = await db.query("SELECT Salary FROM Employees WHERE id = ?", [employeeId]);
        const salary = employee[0].Salary || 0;

        // Insert salary record for the employee
        await db.query(
            "INSERT INTO Salary (Employee_ID, Payment_Date, Total_Salary) VALUES (?, ?, ?)",
            [employeeId, new Date(), salary]
        );

        res.status(200).json({ employeeId, salary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get salaries of all employees
router.get('/getSalaries', async (req, res) => {
    try {
        const [salaries] = await db.query("SELECT * FROM Salary");
        res.status(200).json(salaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get salary of a specific employee
router.get('/getSalary/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    try {
        const [salaries] = await db.query("SELECT * FROM Salary WHERE Employee_ID = ?", [employeeId]);
        res.status(200).json(salaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get sum of all part-time salaries
router.get('/getSumOfPartTimeSalaries', async (req, res) => {
    try {
        const [totalPartTimeSalaries] = await db.query(
            "SELECT SUM(Total_Salary) as totalPartTimeSalaries FROM Salary WHERE Employee_ID IN (SELECT id FROM Employees WHERE role = 'technician')"
        );
        res.status(200).json({ totalPartTimeSalaries: totalPartTimeSalaries[0].totalPartTimeSalaries || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get sum of all salaries for a specific employee
router.get('/getSumOfSalaries/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    try {
        const [totalSalaries] = await db.query(
            "SELECT SUM(Total_Salary) as totalSalaries FROM Salary WHERE Employee_ID = ?",
            [employeeId]
        );
        res.status(200).json({ employeeId, totalSalaries: totalSalaries[0].totalSalaries || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



module.exports = router;