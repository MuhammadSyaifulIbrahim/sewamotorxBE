const express = require("express");
const router = express.Router();
const controller = require("../controllers/auth.controller"); // <-- pastikan benar

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/verify", controller.verifyEmail);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);

module.exports = router;
