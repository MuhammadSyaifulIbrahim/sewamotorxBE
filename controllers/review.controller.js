// controllers/review.controller.js

const db = require("../models");
const Review = db.Review;
const Penyewaan = db.penyewaan;
const User = db.user;
const Kendaraan = db.kendaraan; // optional, jika ingin tampil nama motor

// POST /api/review
exports.createReview = async (req, res) => {
  const { rating, pesan, penyewaanId } = req.body;
  const userId = req.user.id;

  try {
    // Cari penyewaan milik user, status harus SELESAI
    const penyewaan = await Penyewaan.findOne({
      where: { id: penyewaanId, userId },
    });

    if (!penyewaan || penyewaan.status !== "SELESAI") {
      return res.status(403).json({ message: "Belum bisa memberi review" });
    }

    // Cek apakah review sudah ada
    const existing = await Review.findOne({ where: { penyewaanId } });
    if (existing) return res.status(400).json({ message: "Review sudah ada" });

    // Relasi kendaraan_id / kendaraanId harus sesuai field di model
    const kendaraanId = penyewaan.kendaraan_id || penyewaan.kendaraanId;

    // Buat review baru
    const review = await Review.create({
      rating,
      pesan,
      userId,
      penyewaanId,
      kendaraanId,
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/review/kendaraan/:kendaraanId
exports.getReviewByKendaraan = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { kendaraanId: req.params.kendaraanId },
      include: [{ model: User, as: "user", attributes: ["nama"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/review/penyewaan/:penyewaanId
exports.getReviewByPenyewaan = async (req, res) => {
  try {
    const review = await Review.findOne({
      where: { penyewaanId: req.params.penyewaanId },
      include: [{ model: User, as: "user", attributes: ["nama"] }],
    });
    res.json(review); // Kalau null, frontend tau review BELUM ADA
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/review/public  ===> ENDPOINT UNTUK LANDING PAGE, NO AUTH
exports.getAllPublicReview = async (req, res) => {
  try {
    // Ambil 12 review terbaru, join user & kendaraan untuk display
    const reviews = await Review.findAll({
      limit: 12,
      order: [["createdAt", "DESC"]],
      include: [
        { model: User, as: "user", attributes: ["nama"] },
        { model: Kendaraan, as: "kendaraan", attributes: ["nama"] },
      ],
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
