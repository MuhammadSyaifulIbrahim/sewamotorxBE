// controllers/penyewaan.controller.js

const db = require("../models");
const Penyewaan = db.penyewaan;
const Kendaraan = db.kendaraan;
const User = db.user;
const Notifikasi = db.notifikasi;
const NotifikasiAdmin = db.notifikasiAdmin; // pastikan sudah ada model ini!
const { Op } = require("sequelize");
const cloudinary = require("../utils/cloudinary");
const streamifier = require("streamifier");
const { createInvoice } = require("../utils/xendit");
const calculateDynamicPrice = require("../utils/dynamicPricing");
const logActivity = require("../utils/logActivity");
const sendEmail = require("../utils/sendEmail");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// === Utility upload ke cloudinary ===
const uploadBufferToCloudinary = (buffer, folder = "sewamotor/penyewaan") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// =============================
// CREATE Penyewaan + Invoice + EMIT SOCKET + NOTIFIKASI USER & ADMIN
// =============================
exports.create = async (req, res) => {
  try {
    const io = req.app.get("io");
    const userId = req.user.id;
    const {
      kendaraan_id,
      nama_penyewa,
      nomor_telepon,
      jadwal_booking,
      jam_pengambilan,
      durasi_hari,
      metode_pengambilan,
      metode_pengembalian,
      alamat_pengambilan,
      alamat_pengembalian,
      keterangan,
      ongkir_antar,
      ongkir_jemput,
    } = req.body;

    if (
      !kendaraan_id ||
      !nama_penyewa ||
      !nomor_telepon ||
      !jadwal_booking ||
      !metode_pengambilan
    ) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const kendaraan = await Kendaraan.findByPk(parseInt(kendaraan_id));
    if (!kendaraan)
      return res.status(400).json({ message: "Kendaraan tidak ditemukan" });
    if (kendaraan.stok <= 0)
      return res.status(400).json({ message: "Kendaraan tidak tersedia" });

    const hari = Math.max(parseInt(durasi_hari) || 1, 1);

    if (!jadwal_booking || !jam_pengambilan) {
      return res
        .status(400)
        .json({ message: "Tanggal & jam pengambilan wajib diisi" });
    }

    const [jam, menit] = jam_pengambilan.split(":").map(Number);
    if (
      isNaN(jam) ||
      isNaN(menit) ||
      jam < 0 ||
      jam > 23 ||
      menit < 0 ||
      menit > 59
    ) {
      return res
        .status(400)
        .json({ message: "Format jam_pengambilan tidak valid (HH:MM)" });
    }

    const fullPickupDateTime = new Date(jadwal_booking);
    fullPickupDateTime.setHours(jam);
    fullPickupDateTime.setMinutes(menit);
    fullPickupDateTime.setSeconds(0);
    fullPickupDateTime.setMilliseconds(0);

    const jam_pengembalian = new Date(fullPickupDateTime);
    jam_pengembalian.setDate(jam_pengembalian.getDate() + hari);

    // Kalkulasi harga dinamis
    const hargaInfo = calculateDynamicPrice({
      harga_per_hari: kendaraan.harga_sewa,
      diskon_produk: kendaraan.diskon || 0,
      jam_pengambilan: fullPickupDateTime,
      jam_pengembalian,
    });

    const ongkirAntar = Number(ongkir_antar) || 0;
    const ongkirJemput = Number(ongkir_jemput) || 0;
    const hargaTotal = hargaInfo.total + ongkirAntar + ongkirJemput;

    let foto_ktp_url = null;
    let foto_sim_url = null;

    if (req.files?.foto_ktp?.[0]?.buffer) {
      const result = await uploadBufferToCloudinary(
        req.files.foto_ktp[0].buffer,
        "sewamotor/penyewaan"
      );
      foto_ktp_url = result.secure_url;
    }

    if (req.files?.foto_sim?.[0]?.buffer) {
      const result = await uploadBufferToCloudinary(
        req.files.foto_sim[0].buffer,
        "sewamotor/penyewaan"
      );
      foto_sim_url = result.secure_url;
    }

    const externalID = `INV-${Date.now()}`;
    // Ambil data pelanggan berdasarkan user login
    const pelanggan = await User.findByPk(userId);
    // Buat invoice Xendit
    const invoice = await createInvoice({
      externalID,
      referenceID: externalID,
      metadata: { external_id: externalID },
      payerEmail: pelanggan?.email || "noreply@sewamotor.com", // fallback jika email kosong
      description: `Penyewaan ${kendaraan.nama} - ${hari} hari`,
      amount: hargaTotal,
      redirectURL: `${process.env.FRONTEND_URL}/dashboard/history`,
    });

    const penyewaanData = {
      kendaraan_id: parseInt(kendaraan_id),
      userId: parseInt(userId),
      nama_penyewa,
      nomor_telepon,
      jadwal_booking: new Date(jadwal_booking),
      jam_pengambilan: fullPickupDateTime,
      jam_pengembalian,
      durasi_hari: hari,
      metode_pengambilan,
      metode_pengembalian,
      alamat_pengambilan,
      alamat_pengembalian,
      keterangan,
      foto_ktp: foto_ktp_url,
      foto_sim: foto_sim_url,
      ongkir_antar: ongkirAntar,
      ongkir_jemput: ongkirJemput,
      status: "MENUNGGU_PEMBAYARAN",
      payment_url: invoice.invoice_url,
      external_id: externalID,
      harga_total: hargaTotal,
      status_pesanan: "Sedang Dikemas",
    };

    const createdOrder = await Penyewaan.create(penyewaanData);
    kendaraan.stok -= 1;
    await kendaraan.save();

    // =========== NOTIFIKASI USER ===========
    await Notifikasi.create({
      user_id: userId,
      pesan: `Pesanan kamu untuk motor ${kendaraan.nama} berhasil dibuat dengan status MENUNGGU_PEMBAYARAN.`,
      tipe: "success",
      sudah_dibaca: false,
    });
    if (io)
      io.to(`user_${userId}`).emit("notification:new", {
        pesan: `Pesanan kamu untuk motor ${kendaraan.nama} berhasil dibuat dengan status MENUNGGU_PEMBAYARAN.`,
        tipe: "success",
      });

    // =========== NOTIFIKASI ADMIN ===========
    const admins = await User.findAll({ where: { role: "admin" } });
    for (const admin of admins) {
      await NotifikasiAdmin.create({
        adminId: admin.id,
        title: "Pesanan Baru",
        message: `Pesanan baru dari ${nama_penyewa} untuk ${kendaraan.nama}`,
        is_read: false,
      });
      if (io)
        io.to(`admin_${admin.id}`).emit("admin:notification:new", {
          title: "Pesanan Baru",
          message: `Pesanan baru dari ${nama_penyewa} untuk ${kendaraan.nama}`,
        });
    }

    // Emit order baru ke semua (admin dashboard, dll)
    if (io)
      io.emit("order:created", {
        id: createdOrder.id,
        nama_penyewa,
        status: "MENUNGGU_PEMBAYARAN",
        kendaraan: kendaraan.nama,
        jadwal_booking,
        jam_pengambilan,
        harga_total: hargaTotal,
      });

    res.json({
      message: "Berhasil membuat penyewaan",
      payment_url: invoice.invoice_url,
      harga_total: hargaTotal,
      durasi_hari: hari,
    });
  } catch (err) {
    console.error("❌ ERROR CREATE PENYEWAAN:", err.message);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan saat menyimpan penyewaan" });
  }
};

// ======================
// UPDATE STATUS PESANAN (emit socket + NOTIFIKASI USER)
// ======================
exports.updateStatusPesanan = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { id } = req.params;
    const { status_pesanan } = req.body;
    const daftarStatus = [
      "Sedang Dikemas",
      "Segera Ambil di Showroom",
      "Dikirim",
      "Telah Sampai di Tempat Customer",
      "Proses Pengambilan Motor Sewa di Tempat Customer",
      "Selesai Pengambilan Motor dari Tempat Customer",
    ];

    if (!daftarStatus.includes(status_pesanan)) {
      return res.status(400).json({ message: "Status pesanan tidak valid" });
    }

    const penyewaan = await Penyewaan.findByPk(id);
    if (!penyewaan)
      return res.status(404).json({ message: "Penyewaan tidak ditemukan" });

    penyewaan.status_pesanan = status_pesanan;
    await penyewaan.save();

    // === Notifikasi user (DB & socket) ===
    await Notifikasi.create({
      user_id: penyewaan.userId,
      pesan: `Status pesanan kamu berubah menjadi: ${status_pesanan}`,
      tipe: "info",
      sudah_dibaca: false,
    });
    if (io)
      io.to(`user_${penyewaan.userId}`).emit("notification:new", {
        pesan: `Status pesanan kamu berubah menjadi: ${status_pesanan}`,
        tipe: "info",
      });

    // === Notifikasi admin jika keterlambatan (optional, tinggal pakai di status "Terlambat ...") ===
    if (status_pesanan.toLowerCase().includes("terlambat")) {
      const admins = await User.findAll({ where: { role: "admin" } });
      for (const admin of admins) {
        await NotifikasiAdmin.create({
          adminId: admin.id,
          title: "Peringatan Keterlambatan",
          message: `Pesanan ${penyewaan.nama_penyewa} (ID: ${penyewaan.id}) mengalami keterlambatan.`,
          is_read: false,
        });
        if (io)
          io.to(`admin_${admin.id}`).emit("admin:notification:new", {
            title: "Peringatan Keterlambatan",
            message: `Pesanan ${penyewaan.nama_penyewa} (ID: ${penyewaan.id}) mengalami keterlambatan.`,
          });
      }
    }

    // === EMIT SOCKET STATUS UPDATE (untuk dashboard/list) ===
    if (io) io.emit("order:status_updated", { id, status_pesanan });

    res.json({ message: "Status pesanan diperbarui", data: penyewaan });
  } catch (err) {
    res.status(500).json({ message: "Gagal update status pesanan" });
  }
};

// ======================
// UPDATE JAM PENYEWAAN
// ======================
exports.updateJamPenyewaan = async (req, res) => {
  try {
    const { id } = req.params;
    const { jam_pengambilan, durasi_hari } = req.body;

    const data = await Penyewaan.findByPk(id, {
      include: [{ model: Kendaraan, as: "kendaraan" }],
    });
    if (!data)
      return res.status(404).json({ message: "Penyewaan tidak ditemukan" });

    const newDuration = Math.max(parseInt(durasi_hari) || 1, 1);

    if (jam_pengambilan) {
      data.jam_pengambilan = new Date(jam_pengambilan);
    }

    data.durasi_hari = newDuration;

    // Update total harga
    if (data.kendaraan && data.jam_pengambilan) {
      const kembali = new Date(data.jam_pengambilan);
      kembali.setDate(kembali.getDate() + newDuration);
      data.jam_pengembalian = kembali;

      const updatedPrice = calculateDynamicPrice({
        harga_per_hari: data.kendaraan.harga_sewa,
        diskon_produk: data.kendaraan.diskon || 0,
        jam_pengambilan: data.jam_pengambilan,
        jam_pengembalian: kembali,
      });
      data.harga_total = updatedPrice.total;
    }

    // Hitung pengembalian
    if (data.jam_pengambilan && newDuration) {
      const kembali = new Date(data.jam_pengambilan);
      kembali.setDate(kembali.getDate() + newDuration);
      data.jam_pengembalian = kembali;
    }

    // Cek keterlambatan
    let keterangan = data.keterangan || "-";
    if (data.jam_pengembalian && data.durasi_hari) {
      const expected = new Date(data.jam_pengambilan);
      expected.setDate(expected.getDate() + data.durasi_hari);

      const actual = new Date(data.jam_pengembalian);
      const terlambat = Math.floor((actual - expected) / (1000 * 60 * 60 * 24));

      if (terlambat > 0) {
        keterangan = `Terlambat ${terlambat} hari (Rp${terlambat * 50000})`;
      } else if (terlambat === 0) {
        keterangan = "Tepat Waktu";
      }
    }

    data.keterangan = keterangan;
    await data.save();
    await logActivity(
      req.user.id,
      "Update Jam Penyewaan",
      `Admin mengubah jam penyewaan ID ${id} menjadi ${data.jam_pengambilan} selama ${data.durasi_hari} hari`
    );
    res.json({
      message: "Jam penyewaan berhasil diperbarui",
      data: {
        id: data.id,
        jam_pengambilan: data.jam_pengambilan,
        jam_pengembalian: data.jam_pengembalian,
        durasi_hari: data.durasi_hari,
        harga_total: data.harga_total,
        keterangan: data.keterangan,
      },
    });
  } catch (err) {
    console.error("❌ Gagal update jam:", err.message);
    res.status(500).json({ message: "Gagal memperbarui jam penyewaan" });
  }
};

// ======================
// GET RIWAYAT USER
// ======================
exports.getByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await Penyewaan.findAll({
      where: { userId },
      include: [
        { model: Kendaraan, as: "kendaraan" },
        { model: db.Review, as: "review" }, // <<< Tambahkan baris ini!
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(data);
  } catch (err) {
    console.error("❌ ERROR GET BY USER:", err.message);
    res.status(500).json({ message: "Gagal memuat riwayat penyewaan" });
  }
};

// ======================
// GET by ID
// ======================
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Penyewaan.findByPk(id, {
      include: [{ model: Kendaraan, as: "kendaraan" }],
    });
    if (!data)
      return res.status(404).json({ message: "Penyewaan tidak ditemukan" });
    res.json(data);
  } catch (err) {
    console.error("❌ ERROR GET BY ID:", err.message);
    res.status(500).json({ message: "Gagal mengambil detail penyewaan" });
  }
};

// ======================
// GET semua
// ======================
exports.getAll = async (_req, res) => {
  try {
    const data = await Penyewaan.findAll({
      include: [
        { model: Kendaraan, as: "kendaraan" },
        { model: User, as: "user", attributes: ["id", "nama", "email"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Tandai keterlambatan secara dinamis
    const now = new Date();
    data.forEach((item) => {
      if (
        item.status === "BERHASIL" &&
        item.jam_pengembalian &&
        new Date(item.jam_pengembalian) < now
      ) {
        item.dataValues.keterlambatan = true;
      } else {
        item.dataValues.keterlambatan = false;
      }
    });

    res.json(data);
  } catch (err) {
    console.error("❌ ERROR GET ALL:", err.message);
    res.status(500).json({ message: "Gagal mengambil semua data penyewaan" });
  }
};

// ======================
// GET by Date Range
// ======================
exports.getByDateRange = async (req, res) => {
  try {
    const { dari, sampai } = req.query;

    if (!dari || !sampai) {
      return res
        .status(400)
        .json({ message: "Parameter dari dan sampai harus diisi" });
    }

    const data = await Penyewaan.findAll({
      where: {
        jadwal_booking: {
          [Op.between]: [new Date(dari), new Date(sampai)],
        },
      },
      include: [
        { model: Kendaraan, as: "kendaraan" },
        { model: User, as: "user" },
      ],
      order: [["jadwal_booking", "DESC"]],
    });

    res.json(data);
  } catch (err) {
    console.error("❌ ERROR FILTER TANGGAL:", err.message);
    res.status(500).json({ message: "Gagal memfilter data penyewaan" });
  }
};

// ======================
// WEBHOOK Xendit (emit socket)
// ======================
exports.webhook = async (req, res) => {
  try {
    const io = req.app.get("io");
    const CALLBACK_SECRET = process.env.XENDIT_CALLBACK_TOKEN;
    const callbackToken = req.headers["x-callback-token"];
    if (!callbackToken || callbackToken !== CALLBACK_SECRET) {
      return res.status(401).json({ message: "Unauthorized webhook request" });
    }

    const payload = req.body || {};
    const data = payload.data || {};
    const reference_id =
      data?.reference_id ||
      data?.external_id ||
      data?.metadata?.external_id ||
      payload?.reference_id ||
      payload?.external_id;

    if (!reference_id) {
      return res
        .status(400)
        .json({ message: "reference_id tidak ditemukan di payload" });
    }

    const status =
      data.status || payload.status || data.payment_method?.status || "UNKNOWN";

    const metode =
      data.payment_method?.type ||
      data.payment_method?.channel_code ||
      data.payment_channel ||
      payload.payment_method ||
      "TIDAK DIKETAHUI";

    if (!reference_id || !status) {
      return res.status(400).json({ message: "Data webhook tidak lengkap" });
    }

    const penyewaan = await Penyewaan.findOne({
      where: {
        [Op.or]: [
          { external_id: reference_id },
          { xendit_invoice_id: reference_id },
        ],
      },
    });

    if (!penyewaan) {
      return res.status(404).json({ message: "Penyewaan tidak ditemukan" });
    }

    if (["EXPIRED", "FAILED", "CANCELLED"].includes(status.toUpperCase())) {
      const kendaraan = await Kendaraan.findByPk(penyewaan.kendaraan_id);
      if (kendaraan) {
        kendaraan.stok += 1;
        await kendaraan.save();
      }
    }

    switch (status.toUpperCase()) {
      case "PAID":
      case "SUCCEEDED": {
        penyewaan.status = "BERHASIL";

        const user = await User.findByPk(penyewaan.userId);
        const kendaraan = await Kendaraan.findByPk(penyewaan.kendaraan_id);

        if (user && user.email) {
          await sendEmail(
            user.email,
            "Pembayaran Sukses - MotoRent",
            `
<h3>Halo ${user.nama || "Pelanggan"},</h3>
<p>Pembayaran kamu untuk penyewaan motor <strong>${
              kendaraan?.nama
            }</strong> telah <strong>BERHASIL</strong>.</p>

<p><strong>Detail Pesanan:</strong></p>
<ul>
  <li>📅 Pengambilan: ${new Date(penyewaan.jam_pengambilan).toLocaleString(
    "id-ID"
  )}</li>
  <li>📅 Pengembalian: ${new Date(penyewaan.jam_pengembalian).toLocaleString(
    "id-ID"
  )}</li>
  <li>💰 Total Bayar: Rp${penyewaan.harga_total.toLocaleString("id-ID")}</li>
  <li>🔁 Metode Pembayaran: ${penyewaan.metode_pembayaran}</li>
</ul>

<p>Silakan cek detail pesanan di dashboard: <a href="${
              process.env.FRONTEND_URL
            }/dashboard/history">Klik di sini</a></p>

<br><p>Salam,<br>Tim MotoRent</p>
            `
          );
        }
        break;
      }

      case "EXPIRED":
      case "FAILED":
        penyewaan.status = "GAGAL";
        break;

      case "CANCELLED":
        penyewaan.status = "DIBATALKAN";
        break;

      default:
        penyewaan.status = "MENUNGGU_PEMBAYARAN";
    }

    penyewaan.metode_pembayaran = metode;
    await penyewaan.save();

    if (io)
      io.emit("order:payment_status", {
        id: penyewaan.id,
        status: penyewaan.status,
      });

    return res.status(200).json({ message: "Webhook berhasil diproses" });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    return res
      .status(500)
      .json({ message: "Server error saat memproses webhook" });
  }
};

// ======================
// DELETE penyewaan (emit socket)
// ======================
exports.deletePenyewaan = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { id } = req.params;
    const data = await Penyewaan.findByPk(id, {
      include: [{ model: Kendaraan, as: "kendaraan" }],
    });
    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });

    if (data.kendaraan) {
      data.kendaraan.stok += 1;
      await data.kendaraan.save();
    }

    await data.destroy();
    await logActivity(
      req.user.id,
      "Hapus Penyewaan",
      `Admin menghapus penyewaan oleh ${data.nama_penyewa} (${data.nomor_telepon}) untuk kendaraan ${data.kendaraan?.nama}`
    );

    // EMIT HAPUS
    if (io) io.emit("order:deleted", { id });

    res.json({ message: "Berhasil dihapus" });
  } catch (err) {
    console.error("❌ ERROR DELETE:", err.message);
    res.status(500).json({ message: "Gagal menghapus data" });
  }
};

// ======================
// SELESAIKAN PENYEWAAN (emit socket)
// ======================
exports.markAsSelesai = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { id } = req.params;
    const data = await Penyewaan.findByPk(id);

    if (!data) {
      return res.status(404).json({ message: "Penyewaan tidak ditemukan" });
    }

    if (!["BERHASIL", "DALAM PENYEWAAN"].includes(data.status)) {
      return res.status(400).json({
        message: "Penyewaan belum dibayar atau sudah selesai sebelumnya",
      });
    }

    // Update status menjadi SELESAI tanpa mengubah metode pembayaran
    await Penyewaan.update({ status: "SELESAI" }, { where: { id } });
    await logActivity(
      req.user.id,
      "Selesaikan Penyewaan",
      `Admin menyelesaikan penyewaan ID ${id}`
    );

    // EMIT SELESAI
    if (io) io.emit("order:selesai", { id });

    res.json({ message: "Penyewaan berhasil diselesaikan", id });
  } catch (err) {
    console.error("❌ ERROR SELESAIKAN:", err.message);
    res.status(500).json({ message: "Gagal menyelesaikan penyewaan" });
  }
};

// ======================
// EXPORT Excel & PDF
// ======================
exports.exportExcel = async (req, res) => {
  try {
    const { dari, sampai } = req.query;
    if (!dari || !sampai) {
      return res
        .status(400)
        .json({ message: "Parameter dari & sampai harus diisi" });
    }

    const penyewaanList = await Penyewaan.findAll({
      where: {
        jadwal_booking: { [Op.between]: [new Date(dari), new Date(sampai)] },
        status: "SELESAI", // hanya pesanan selesai
      },
      include: [
        { model: Kendaraan, as: "kendaraan" },
        { model: User, as: "user", attributes: ["email"] },
      ],
      order: [["jadwal_booking", "ASC"]],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pesanan Selesai");

    worksheet.columns = [
      { header: "Nama Penyewa", key: "nama_penyewa", width: 18 },
      { header: "Email", key: "email", width: 24 },
      { header: "Motor", key: "motor", width: 20 },
      { header: "Jadwal Booking", key: "jadwal_booking", width: 21 },
      { header: "Durasi (hari)", key: "durasi_hari", width: 13 },
      { header: "Total Biaya", key: "harga_total", width: 16 },
      { header: "Status", key: "status", width: 14 },
      { header: "Ongkir Antar", key: "ongkir_antar", width: 14 },
      { header: "Ongkir Jemput", key: "ongkir_jemput", width: 14 },
      { header: "Status Pesanan", key: "status_pesanan", width: 24 },
    ];

    let totalPendapatan = 0;

    penyewaanList.forEach((row) => {
      worksheet.addRow({
        nama_penyewa: row.nama_penyewa,
        email: row.user?.email || "-",
        motor: row.kendaraan?.nama || "-",
        jadwal_booking: row.jadwal_booking
          ? new Date(row.jadwal_booking).toLocaleString("id-ID")
          : "-",
        durasi_hari: row.durasi_hari,
        harga_total: row.harga_total,
        status: row.status.replace(/_/g, " "),
        ongkir_antar: row.ongkir_antar || 0,
        ongkir_jemput: row.ongkir_jemput || 0,
        status_pesanan: row.status_pesanan || "-",
      });
      totalPendapatan += Number(row.harga_total || 0);
    });

    // Tambahkan baris kosong dan total pendapatan di bawahnya
    worksheet.addRow({});
    worksheet.addRow({
      nama_penyewa: "",
      email: "",
      motor: "",
      jadwal_booking: "",
      durasi_hari: "",
      harga_total: "Total Pendapatan",
      status: `Rp${totalPendapatan.toLocaleString("id-ID")}`,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=pesanan_selesai.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Export Excel error:", err);
    res.status(500).json({ message: "Gagal export Excel" });
  }
};

exports.exportPDF = async (req, res) => {
  try {
    const { dari, sampai } = req.query;
    if (!dari || !sampai) {
      return res
        .status(400)
        .json({ message: "Parameter dari & sampai harus diisi" });
    }

    const penyewaanList = await Penyewaan.findAll({
      where: {
        jadwal_booking: { [Op.between]: [new Date(dari), new Date(sampai)] },
        status: "SELESAI",
      },
      include: [
        { model: Kendaraan, as: "kendaraan" },
        { model: User, as: "user", attributes: ["email"] },
      ],
      order: [["jadwal_booking", "ASC"]],
    });

    let totalPendapatan = 0;

    const doc = new PDFDocument({ margin: 30, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=pesanan_selesai.pdf"
    );
    doc.pipe(res);

    doc.fontSize(18).text("Laporan Pesanan Selesai", { align: "center" });
    doc.moveDown(1);

    penyewaanList.forEach((row, idx) => {
      doc
        .fontSize(12)
        .text(`${idx + 1}. Nama Penyewa: ${row.nama_penyewa}`)
        .text(`   Email: ${row.user?.email || "-"}`)
        .text(`   Motor: ${row.kendaraan?.nama || "-"}`)
        .text(
          `   Jadwal Booking: ${
            row.jadwal_booking
              ? new Date(row.jadwal_booking).toLocaleString("id-ID")
              : "-"
          }`
        )
        .text(`   Durasi: ${row.durasi_hari} hari`)
        .text(
          `   Total Biaya: Rp${Number(row.harga_total).toLocaleString("id-ID")}`
        )
        .text(`   Status: ${row.status.replace(/_/g, " ")}`)
        .text(`   Ongkir Antar: Rp${row.ongkir_antar || 0}`)
        .text(`   Ongkir Jemput: Rp${row.ongkir_jemput || 0}`)
        .text(`   Status Pesanan: ${row.status_pesanan || "-"}`)
        .moveDown(0.7);

      totalPendapatan += Number(row.harga_total || 0);
    });

    doc.moveDown(1);
    doc
      .fontSize(14)
      .fillColor("green")
      .text(`Total Pendapatan: Rp${totalPendapatan.toLocaleString("id-ID")}`, {
        align: "right",
      });

    doc.end();
  } catch (err) {
    console.error("❌ Export PDF error:", err);
    res.status(500).json({ message: "Gagal export PDF" });
  }
};

// ======================
// UPLOAD BUKTI PENERIMAAN (emit socket)
// ======================
exports.uploadBuktiPenerimaan = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { id } = req.params;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "File tidak ditemukan" });
    }
    const penyewaan = await Penyewaan.findByPk(id);
    if (!penyewaan)
      return res.status(404).json({ message: "Penyewaan tidak ditemukan" });

    const cloudResult = await uploadBufferToCloudinary(
      req.file.buffer,
      "sewamotor/bukti_penerimaan"
    );
    penyewaan.bukti_penerimaan = cloudResult.secure_url;
    await penyewaan.save();

    await logActivity(
      req.user.id,
      "Upload Bukti Penerimaan",
      `Upload bukti penerimaan untuk penyewaan ID ${id}`
    );

    // EMIT BUKTI
    if (io)
      io.emit("order:bukti_penerimaan", { id, url: cloudResult.secure_url });

    res.json({
      message: "Bukti penerimaan berhasil diupload",
      url: cloudResult.secure_url,
    });
  } catch (err) {
    console.error("❌ UPLOAD BUKTI PENERIMAAN:", err.message);
    res.status(500).json({ message: "Gagal upload bukti penerimaan" });
  }
};

// ======================
// UPLOAD BUKTI PENGEMBALIAN (emit socket)
// ======================
exports.uploadBuktiPengembalian = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { id } = req.params;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "File tidak ditemukan" });
    }
    const penyewaan = await Penyewaan.findByPk(id);
    if (!penyewaan)
      return res.status(404).json({ message: "Penyewaan tidak ditemukan" });

    const cloudResult = await uploadBufferToCloudinary(
      req.file.buffer,
      "sewamotor/bukti_pengembalian"
    );
    penyewaan.bukti_pengembalian = cloudResult.secure_url;
    await penyewaan.save();

    await logActivity(
      req.user.id,
      "Upload Bukti Pengembalian",
      `Upload bukti pengembalian untuk penyewaan ID ${id}`
    );

    // EMIT BUKTI
    if (io)
      io.emit("order:bukti_pengembalian", { id, url: cloudResult.secure_url });

    res.json({
      message: "Bukti pengembalian berhasil diupload",
      url: cloudResult.secure_url,
    });
  } catch (err) {
    console.error("❌ UPLOAD BUKTI PENGEMBALIAN:", err.message);
    res.status(500).json({ message: "Gagal upload bukti pengembalian" });
  }
};
