const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");

router.post("/xendit-callback", paymentController.webhook);

module.exports = router;
