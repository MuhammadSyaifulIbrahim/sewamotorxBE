// controllers/maps.controller.js
const axios = require("axios");

exports.getDistance = async (req, res) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res
        .status(400)
        .json({ error: "origin dan destination diperlukan" });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      origin
    )}&destinations=${encodeURIComponent(
      destination
    )}&mode=driving&language=id-ID&key=${apiKey}`;

    const response = await axios.get(url);
    const data = response.data;

    // Debug log agar bisa pantau response Google
    console.log("🔍 GOOGLE RESPONSE:", JSON.stringify(data, null, 2));

    // Cek struktur dan handle error API Google
    if (
      !data.rows ||
      !data.rows[0] ||
      !data.rows[0].elements ||
      !data.rows[0].elements[0] ||
      data.rows[0].elements[0].status !== "OK"
    ) {
      return res.status(400).json({
        error: "Gagal mendapatkan jarak dari Google",
        debug: data,
      });
    }

    // Ambil data jarak & durasi
    const element = data.rows[0].elements[0];
    const distance = element.distance; // { text, value }
    const duration = element.duration; // { text, value }

    return res.json({ distance, duration });
  } catch (err) {
    console.error("❌ Server error:", err.message);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
};
