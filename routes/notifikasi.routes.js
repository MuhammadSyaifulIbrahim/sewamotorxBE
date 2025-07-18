const express = require("express");
const router = express.Router();
const notifikasiCtrl = require("../controllers/notifikasi.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.get("/", notifikasiCtrl.getAllByUser);
router.put("/:id/read", notifikasiCtrl.markAsRead);

module.exports = router;
