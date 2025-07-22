const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const auth = require("../middleware/auth.middleware");

router.post("/", auth.authenticateToken, reviewController.createReview);
router.get("/kendaraan/:kendaraanId", reviewController.getReviewByKendaraan);
// Tambahan ini ⬇️
router.get("/penyewaan/:penyewaanId", reviewController.getReviewByPenyewaan);

module.exports = router;
