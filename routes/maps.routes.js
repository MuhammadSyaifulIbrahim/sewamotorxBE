// routes/maps.routes.js
const express = require("express");
const router = express.Router();
const mapsController = require("../controllers/maps.controller");

// Logging + Handler sekaligus (pakai middleware inline)
router.get(
  "/distance",
  (req, res, next) => {
    console.log("🔍 GET /api/maps/distance hit");
    next();
  },
  mapsController.getDistance
);

console.log("✅ maps.routes.js loaded");

module.exports = router;
