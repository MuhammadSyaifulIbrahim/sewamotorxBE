const express = require("express");
const router = express.Router();
const notifCtrl = require("../controllers/notifikasi.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.use(authenticateToken);

router.get("/", notifCtrl.getAllByUser);
router.post("/:id/baca", notifCtrl.markAsRead); // mark as read (single)
router.post("/mark-read-all", notifCtrl.markAllRead); // mark all as read

module.exports = router;
