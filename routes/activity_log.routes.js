// routes/activity_log.routes.js
const express = require("express");
const router = express.Router();
const { getAllLogs } = require("../controllers/activity_log.controller");

router.get("/", getAllLogs);

module.exports = router;
