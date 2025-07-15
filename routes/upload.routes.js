// routes/upload.routes.js

import express from "express";
import upload from "../middleware/upload.js";
import { uploadImage } from "../controllers/uploadController.js";

const router = express.Router();

router.post("/upload", upload.single("image"), uploadImage);

export default router;
