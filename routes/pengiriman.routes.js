// routes/pengiriman.routes.js

const express = require("express");
const router = express.Router();
const pengiriman = require("../controllers/pengiriman.controller");

// HILANGKAN/MATIKAN DULU 'auth' sampai yakin benar
// const auth = require("../middleware/auth.middleware");

// Tambah pengiriman
router.post("/", pengiriman.create);
// List semua pengiriman
router.get("/", pengiriman.getAll);
// Hapus pengiriman
router.delete("/:id", pengiriman.delete);

// EXPORT EXCEL & PDF
router.get("/export/excel", pengiriman.exportExcel);
router.get("/export/pdf", pengiriman.exportPdf);

module.exports = router;
