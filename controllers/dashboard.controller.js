const db = require("../models");
const { Op, fn, col } = db.Sequelize;

const Penyewaan = db.penyewaan;
const Kendaraan = db.kendaraan;

const bulanPanjang = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/* 1. Ringkasan Statistik */
exports.getDashboardStats = async (_req, res) => {
  try {
    const [totalPelanggan, totalKendaraan, totalPenyewaan, totalPendapatan] =
      await Promise.all([
        Penyewaan.count({ distinct: true, col: "nama_penyewa" }),
        Kendaraan.count(),
        Penyewaan.count(),
        Penyewaan.sum("harga_total", { where: { status: "SELESAI" } }),
      ]);
    res.json({
      totalPelanggan,
      totalKendaraan,
      totalPenyewaan,
      totalPendapatan: totalPendapatan || 0,
    });
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil data statistik",
      error: err.message,
    });
  }
};

/* 2. Aktivitas Terbaru + Emit Socket Notifikasi */
exports.getAktivitasTerbaru = async (req, res) => {
  try {
    const data = await Penyewaan.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      include: [{ model: Kendaraan, as: "kendaraan" }],
    });
    const formatted = data.map((x) => ({
      id: x.id,
      nama_penyewa: x.nama_penyewa,
      kendaraan: x.kendaraan?.nama || "Tidak diketahui",
      createdAt: x.createdAt,
    }));

    // Emit socket ke semua admin (broadcast jika ada aktivitas terbaru)
    if (req.app && req.app.get("io") && formatted.length > 0) {
      req.app.get("io").emit("notifikasi:aktivitas", {
        message: "Ada aktivitas penyewaan terbaru",
        data: formatted,
      });
    }

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil aktivitas terbaru",
      error: err.message,
    });
  }
};

/* 3. Statistik Jumlah Penyewaan per Bulan */
exports.getStatistikBulanan = async (_req, res) => {
  try {
    const tahun = new Date().getFullYear();
    const raw = await Penyewaan.findAll({
      attributes: [
        [fn("MONTH", col("jadwal_booking")), "bulan"],
        [fn("COUNT", col("id")), "jumlah"],
      ],
      where: db.Sequelize.where(fn("YEAR", col("jadwal_booking")), tahun),
      group: [fn("MONTH", col("jadwal_booking"))],
      raw: true,
    });

    const lengkap = bulanPanjang.map((nama, i) => {
      const found = raw.find((r) => Number(r.bulan) === i + 1);
      return { bulan: nama, jumlah: found ? Number(found.jumlah) : 0 };
    });
    res.json(lengkap);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil data statistik bulanan",
      error: err.message,
    });
  }
};

/* 4. Pendapatan Bulanan */
exports.getPendapatanBulanan = async (_req, res) => {
  try {
    const tahun = new Date().getFullYear();
    const penyewaanRaw = await Penyewaan.findAll({
      attributes: [
        [fn("MONTH", col("jadwal_booking")), "bulan"],
        [fn("SUM", col("harga_total")), "total_sewa"],
      ],
      where: {
        [Op.and]: [
          db.Sequelize.where(fn("YEAR", col("jadwal_booking")), tahun),
          { status: "SELESAI" },
        ],
      },
      group: [fn("MONTH", col("jadwal_booking"))],
      raw: true,
    });

    const lengkap = bulanPanjang.map((nama, i) => {
      const sewa = penyewaanRaw.find((x) => Number(x.bulan) === i + 1);
      return {
        bulan: nama,
        total_pendapatan: Number(sewa?.total_sewa) || 0,
      };
    });

    res.json(lengkap);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil pendapatan bulanan",
      error: err.message,
    });
  }
};

/* 5. Penyewa Terlambat + Emit Socket Notif */
exports.getTerlambat = async (req, res) => {
  try {
    const today = new Date();
    const data = await Penyewaan.findAll({
      where: {
        jam_pengembalian: { [Op.lt]: today },
        status: "BERHASIL",
      },
      include: [{ model: Kendaraan, as: "kendaraan" }],
      order: [["jam_pengembalian", "ASC"]],
    });
    const formatted = data.map((x) => ({
      id: x.id,
      nama_penyewa: x.nama_penyewa,
      kendaraan: x.kendaraan?.nama || "Tidak diketahui",
      jadwal_booking: x.jadwal_booking,
    }));

    // Emit socket notif keterlambatan
    if (req.app && req.app.get("io") && formatted.length > 0) {
      req.app.get("io").emit("notifikasi:keterlambatan", {
        message: `${formatted.length} penyewaan telat pengembalian!`,
        data: formatted,
      });
    }

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil data keterlambatan",
      error: err.message,
    });
  }
};
