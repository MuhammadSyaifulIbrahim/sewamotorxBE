const express = require("express");
const router = express.Router();
const notifikasiAdminCtrl = require("../controllers/notifikasiAdmin.controller");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/auth.middleware");

router.use(authenticateToken);
router.use(authorizeRole("admin"));

router.get("/", notifikasiAdminCtrl.getAllByAdmin);
router.put("/:id/read", notifikasiAdminCtrl.markAsRead);

module.exports = router;
