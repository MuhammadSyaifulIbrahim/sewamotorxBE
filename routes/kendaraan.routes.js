// routes/kendaraan.routes.js

const express = require("express");
const router = express.Router();

const kendaraanController = require("../controllers/kendaraan.controller");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/auth.middleware");
const upload = require("../middleware/upload"); // Harus export instance multer

// ==============================
// ROUTES KENDARAAN
// ==============================

// GET: Semua kendaraan - user & admin
router.get("/", authenticateToken, kendaraanController.getAll);

// GET: Khusus tracking - ambil motor yang ada gpsId/gpsUrl (untuk menu tracking admin)
// Kalau mau tanpa login, hapus authenticateToken. Kalau mau aman, pakai auth.
router.get(
  "/motors-with-gps",
  authenticateToken,
  kendaraanController.getMotorsWithGps
);

// GET: Detail kendaraan berdasarkan ID
router.get("/:id", authenticateToken, kendaraanController.getById);

// POST: Tambah kendaraan (admin only, upload gambar & qrImage)
router.post(
  "/",
  authenticateToken,
  authorizeRole("admin"),
  upload.fields([
    { name: "gambar", maxCount: 1 },
    { name: "qrImage", maxCount: 1 },
  ]),
  kendaraanController.create
);

// PUT: Edit kendaraan (admin only, support upload gambar & qrImage baru)
router.put(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  upload.fields([
    { name: "gambar", maxCount: 1 },
    { name: "qrImage", maxCount: 1 },
  ]),
  kendaraanController.update
);

// DELETE: Hapus kendaraan (admin only)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRole("admin"),
  kendaraanController.remove
);

module.exports = router;
