const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// Ambil semua user
router.get("/", authenticateToken, userController.getAllUsers);

// Toggle status user aktif <-> nonaktif
router.put("/:id/status", authenticateToken, userController.toggleUserStatus);

module.exports = router;
