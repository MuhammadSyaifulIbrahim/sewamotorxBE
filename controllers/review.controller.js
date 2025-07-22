// controllers/review.controller.js

const db = require("../models");
const Review = db.Review; // Huruf besar karena index.js pakai db.Review
const Penyewaan = db.penyewaan; // Huruf kecil karena index.js pakai db.penyewaan

exports.createReview = async (req, res) => {
  const { rating, pesan, penyewaanId } = req.body;
  const userId = req.user.id;

  try {
    // Cari data penyewaan milik user, status harus SELESAI
    const penyewaan = await Penyewaan.findOne({
      where: { id: penyewaanId, userId },
    });

    if (!penyewaan || penyewaan.status !== "SELESAI") {
      return res.status(403).json({ message: "Belum bisa memberi review" });
    }

    // Cek apakah review sudah ada
    const existing = await Review.findOne({ where: { penyewaanId } });
    if (existing) return res.status(400).json({ message: "Review sudah ada" });

    // Buat review baru
    const review = await Review.create({
      rating,
      pesan,
      userId,
      penyewaanId,
      kendaraanId: penyewaan.kendaraan_id, // Pastikan nama kolom di DB benar (kendaraan_id atau kendaraanId)
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
