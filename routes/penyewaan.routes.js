const express = require("express");
const router = express.Router();
const penyewaanController = require("../controllers/penyewaan.controller");
const { authenticateToken } = require("../middleware/auth.middleware");
const multer = require("multer");

// ======== MEMORY STORAGE UNTUK BUFFER UPLOAD ========
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
});

// === VALIDASI INPUT PENYEWAAN ===
const validatePenyewaanData = (req, res, next) => {
  const { jadwal_booking, jam_pengambilan, durasi_hari } = req.body;
  if (!jadwal_booking) {
    return res.status(400).json({ message: "jadwal_booking wajib diisi" });
  }
  const bookingDate = new Date(jadwal_booking);
  if (isNaN(bookingDate.getTime())) {
    return res
      .status(400)
      .json({ message: "Format jadwal_booking tidak valid" });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
    return res
      .status(400)
      .json({ message: "Tanggal booking tidak boleh di masa lalu" });
  }
  if (durasi_hari && (isNaN(durasi_hari) || parseInt(durasi_hari) < 1)) {
    return res
      .status(400)
      .json({ message: "Durasi hari harus angka minimal 1" });
  }
  if (jam_pengambilan) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(jam_pengambilan)) {
      return res
        .status(400)
        .json({ message: "Format jam_pengambilan tidak valid (HH:MM)" });
    }
  }
  next();
};

// ======================== ROUTES ========================

// ✅ Webhook dari Xendit (tanpa auth)
router.post("/webhook", penyewaanController.webhook);

// 🔒 Export penyewaan ke Excel
router.get("/export/excel", authenticateToken, penyewaanController.exportExcel);

// 🔒 Export penyewaan ke PDF
router.get("/export/pdf", authenticateToken, penyewaanController.exportPDF);

// 🔒 Buat penyewaan (dengan upload KTP/SIM)
router.post(
  "/",
  authenticateToken,
  upload.fields([
    { name: "foto_ktp", maxCount: 1 },
    { name: "foto_sim", maxCount: 1 },
  ]),
  validatePenyewaanData,
  penyewaanController.create
);

// 🔒 === UPLOAD BUKTI PENERIMAAN ===
router.post(
  "/upload/bukti-penerimaan/:id",
  authenticateToken,
  upload.single("foto"),
  penyewaanController.uploadBuktiPenerimaan
);

// 🔒 === UPLOAD BUKTI PENGEMBALIAN ===
router.post(
  "/upload/bukti-pengembalian/:id",
  authenticateToken,
  upload.single("foto"),
  penyewaanController.uploadBuktiPengembalian
);

// 🔒 Riwayat penyewaan user login
router.get("/user", authenticateToken, penyewaanController.getByUser);

// 🔒 Filter berdasarkan tanggal
router.get("/tanggal", authenticateToken, penyewaanController.getByDateRange);

// 🔒 Update status pesanan (admin/manual)
router.patch(
  "/:id/status",
  authenticateToken,
  (req, res, next) => {
    if (!req.body.status_pesanan) {
      return res.status(400).json({ message: "Status pesanan wajib diisi" });
    }
    next();
  },
  penyewaanController.updateStatusPesanan
);

// 🔒 Tandai pesanan sebagai selesai ✅ — HARUS DI ATAS :id
router.patch(
  "/:id/selesai",
  authenticateToken,
  penyewaanController.markAsSelesai
);

// 🔒 Update jam pengambilan & durasi
router.patch(
  "/:id/jam",
  authenticateToken,
  (req, res, next) => {
    const { jam_pengambilan, durasi_hari } = req.body;
    if (jam_pengambilan) {
      const dateTime = new Date(jam_pengambilan);
      if (isNaN(dateTime.getTime())) {
        return res
          .status(400)
          .json({ message: "Format jam_pengambilan tidak valid" });
      }
    }
    if (durasi_hari && (isNaN(durasi_hari) || parseInt(durasi_hari) < 1)) {
      return res
        .status(400)
        .json({ message: "Durasi hari harus angka minimal 1" });
    }
    next();
  },
  penyewaanController.updateJamPenyewaan
);

// 🔒 Detail penyewaan tertentu
router.get("/:id", authenticateToken, penyewaanController.getById);

// 🔒 Hapus penyewaan
router.delete("/:id", authenticateToken, penyewaanController.deletePenyewaan);

// 🔒 Ambil semua data penyewaan (admin)
router.get("/", authenticateToken, penyewaanController.getAll);

module.exports = router;
