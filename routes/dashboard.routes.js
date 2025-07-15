const express = require("express");
const router = express.Router();
const dashboard = require("../controllers/dashboard.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// Endpoint dashboard untuk admin (wajib login)
router.get("/stats", authenticateToken, dashboard.getDashboardStats);
router.get(
  "/statistik-bulanan",
  authenticateToken,
  dashboard.getStatistikBulanan
);
router.get(
  "/pendapatan-bulanan",
  authenticateToken,
  dashboard.getPendapatanBulanan
);
router.get(
  "/pengiriman-bulanan",
  authenticateToken,
  dashboard.getPengirimanBulanan // <-- Tambahan: Statistik Pengiriman Bulanan
);
router.get("/aktivitas", authenticateToken, dashboard.getAktivitasTerbaru);
router.get("/terlambat", authenticateToken, dashboard.getTerlambat);

module.exports = router;
