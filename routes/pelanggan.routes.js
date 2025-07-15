const express = require("express");
const router = express.Router();
const pelanggan = require("../controllers/pelanggan.controller");

router.get("/", pelanggan.getAll);
router.post("/", pelanggan.create);
router.put("/:id", pelanggan.update);
router.delete("/:id", pelanggan.delete);

module.exports = router;
