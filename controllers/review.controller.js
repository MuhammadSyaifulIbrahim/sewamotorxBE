const { Review, Penyewaan } = require("../models");

exports.createReview = async (req, res) => {
  const { rating, pesan, penyewaanId } = req.body;
  const userId = req.user.id;

  try {
    const penyewaan = await Penyewaan.findOne({
      where: { id: penyewaanId, userId },
    });

    if (!penyewaan || penyewaan.status !== "SELESAI") {
      return res.status(403).json({ message: "Belum bisa memberi review" });
    }

    const existing = await Review.findOne({ where: { penyewaanId } });
    if (existing) return res.status(400).json({ message: "Review sudah ada" });

    const review = await Review.create({
      rating,
      pesan,
      userId,
      penyewaanId,
      kendaraanId: penyewaan.kendaraanId,
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getReviewByKendaraan = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { kendaraanId: req.params.kendaraanId },
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
