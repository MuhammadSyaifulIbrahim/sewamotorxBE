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

    // Tambahkan ini untuk debug log
    console.log("🔍 GOOGLE RESPONSE:", JSON.stringify(data, null, 2));

    if (data.rows[0].elements[0].status !== "OK") {
      return res
        .status(400)
        .json({ error: "Gagal mendapatkan jarak", debug: data });
    }

    const distance = data.rows[0].elements[0].distance;
    const duration = data.rows[0].elements[0].duration;

    return res.json({ distance, duration });
  } catch (err) {
    console.error("❌ Server error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
