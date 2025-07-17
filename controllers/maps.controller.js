const axios = require("axios");

exports.getDistance = async (req, res) => {
  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res
        .status(400)
        .json({ error: "Origin dan destination diperlukan" });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      origin
    )}&destinations=${encodeURIComponent(
      destination
    )}&key=${apiKey}&mode=driving&language=id-ID`;

    console.log("🔗 URL:", url);

    const response = await axios.get(url);
    const data = response.data;

    console.log("📦 RESPONSE:", data);

    if (
      !data.rows ||
      !data.rows[0] ||
      !data.rows[0].elements[0] ||
      data.rows[0].elements[0].status !== "OK"
    ) {
      return res.status(400).json({ error: "Gagal mendapatkan jarak" });
    }

    const distance = data.rows[0].elements[0].distance;
    const duration = data.rows[0].elements[0].duration;

    return res.json({ distance, duration });
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
};
