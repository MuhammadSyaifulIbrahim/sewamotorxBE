// controllers/uploadController.js

import cloudinary from "../utils/cloudinary.js";

export const uploadImage = async (req, res) => {
  try {
    const file = req.file.path;

    const result = await cloudinary.uploader.upload(file, {
      folder: "uploads",
      public_id: "custom_id_" + Date.now(),
    });

    res.json({
      message: "Upload berhasil",
      url: result.secure_url,
    });
  } catch (error) {
    res.status(500).json({ message: "Upload gagal", error });
  }
};
