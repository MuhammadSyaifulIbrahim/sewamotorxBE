const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const auth = require("../middleware/auth.middleware");

router.post("/", auth.authenticateToken, reviewController.createReview);
router.get("/kendaraan/:kendaraanId", reviewController.getReviewByKendaraan);
router.get("/penyewaan/:penyewaanId", reviewController.getReviewByPenyewaan);

// Endpoint public review untuk landing page:
router.get("/public", reviewController.getAllPublicReview);

module.exports = router;
