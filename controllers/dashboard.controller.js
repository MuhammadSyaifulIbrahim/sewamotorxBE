const db = require("../models");
const { Op, fn, col } = db.Sequelize;

const Penyewaan = db.penyewaan;
const Kendaraan = db.kendaraan;
const Pengiriman = db.pengiriman; // Pastikan model sudah ada

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
    res
      .status(500)
      .json({ message: "Gagal mengambil data statistik", error: err.message });
  }
};

/* 2. Aktivitas Terbaru */
exports.getAktivitasTerbaru = async (_req, res) => {
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

/* 4. Pendapatan Bulanan (Penyewaan + Pengiriman) */
exports.getPendapatanBulanan = async (_req, res) => {
  try {
    const tahun = new Date().getFullYear();

    // Dapatkan pendapatan SEWA per bulan
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

    // Dapatkan pendapatan PENGIRIMAN per bulan
    const pengirimanRaw = await Pengiriman.findAll({
      attributes: [
        [fn("MONTH", col("waktu_input")), "bulan"],
        [fn("SUM", col("biaya")), "total_pengiriman"],
      ],
      where: db.Sequelize.where(fn("YEAR", col("waktu_input")), tahun),
      group: [fn("MONTH", col("waktu_input"))],
      raw: true,
    });

    // Gabungkan hasil per bulan
    const lengkap = bulanPanjang.map((nama, i) => {
      const sewa = penyewaanRaw.find((x) => Number(x.bulan) === i + 1);
      const kirim = pengirimanRaw.find((x) => Number(x.bulan) === i + 1);
      const totalPendapatan =
        (Number(sewa?.total_sewa) || 0) +
        (Number(kirim?.total_pengiriman) || 0);
      return {
        bulan: nama,
        total_pendapatan: totalPendapatan,
        total_sewa: Number(sewa?.total_sewa) || 0,
        total_pengiriman: Number(kirim?.total_pengiriman) || 0,
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

/* 5. Statistik Pengiriman Bulanan */
exports.getPengirimanBulanan = async (_req, res) => {
  try {
    const tahun = new Date().getFullYear();
    const raw = await Pengiriman.findAll({
      attributes: [
        [fn("MONTH", col("waktu_input")), "bulan"],
        [fn("COUNT", col("id")), "jumlah_pengiriman"],
        [fn("SUM", col("biaya")), "total_biaya_pengiriman"],
      ],
      where: db.Sequelize.where(fn("YEAR", col("waktu_input")), tahun),
      group: [fn("MONTH", col("waktu_input"))],
      raw: true,
    });

    const lengkap = bulanPanjang.map((nama, i) => {
      const found = raw.find((r) => Number(r.bulan) === i + 1);
      return {
        bulan: nama,
        jumlah_pengiriman: found ? Number(found.jumlah_pengiriman) : 0,
        total_biaya_pengiriman: found
          ? Number(found.total_biaya_pengiriman)
          : 0,
      };
    });

    res.json(lengkap);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil statistik pengiriman bulanan",
      error: err.message,
    });
  }
};

/* 6. Penyewa Terlambat */
exports.getTerlambat = async (_req, res) => {
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

    res.json(formatted);
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil data keterlambatan",
      error: err.message,
    });
  }
};
