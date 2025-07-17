const express = require("express");
const router = express.Router();
const mapsController = require("../controllers/maps.controller");

router.get("/distance", mapsController.getDistance);

console.log("✅ maps.routes.js loaded");

router.get(
  "/distance",
  (req, res, next) => {
    console.log("🔍 GET /api/maps/distance hit");
    next();
  },
  mapsController.getDistance
);

module.exports = router;
