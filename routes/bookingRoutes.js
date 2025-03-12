const express = require("express");
const db = require("../config/db");
const router = express.Router();

router.post("/pending-bookings", async (req, res) => {
    const { customerId, jobId, date, time } = req.body;

    if (!customerId || !jobId || !date || !time) {
        return res.status(400).json({ message: "All details are required" });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Insert into Booking table with status 'Pending'
        await connection.query(
            "INSERT INTO Booking (CustomerID, JobID, Date, Time, status) VALUES (?, ?, ?, ?, 'Pending')",
            [customerId, jobId, date, time]
        );

        // Update job status to 'In Progress'
        await connection.query(
            "UPDATE jobs SET status = 'In Progress' WHERE job_id = ?",
            [jobId]
        );

        await connection.commit();
        res.status(201).json({ message: "Pending booking created successfully!" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

router.post("/approve-booking/:id", async (req, res) => {
    const { id } = req.params;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Get pending booking details
        const [pendingBooking] = await connection.query(
            "SELECT * FROM Booking WHERE BookingID = ? AND status = 'Pending'",
            [id]
        );

        if (pendingBooking.length === 0) {
            return res.status(404).json({ message: "Pending booking not found or already approved" });
        }

        const { CustomerID, JobID, Date, Time } = pendingBooking[0];

        // Update booking status to 'Approved'
        await connection.query(
            "UPDATE Booking SET status = 'Approved' WHERE BookingID = ?",
            [id]
        );

        // Update job status to 'Approved'
        await connection.query(
            "UPDATE jobs SET status = 'Approved' WHERE job_id = ?",
            [JobID]
        );

        await connection.commit();
        res.status(200).json({ message: "Booking approved successfully!" });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;