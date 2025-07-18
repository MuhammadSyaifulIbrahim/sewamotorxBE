const db = require("../models");
const Notifikasi = db.notifikasi;

// Ambil semua notifikasi user (history)
exports.getAllByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifs = await Notifikasi.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
    });
    res.json(notifs);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ message: "Gagal mengambil notifikasi" });
  }
};

// Tandai notifikasi sudah dibaca (satuan)
exports.markAsRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const notif = await Notifikasi.findByPk(notifId);

    if (!notif)
      return res.status(404).json({ message: "Notifikasi tidak ditemukan" });

    // Mark as read, gunakan angka untuk tinyint(1)
    notif.sudah_dibaca = 1;
    await notif.save();

    res.json({ message: "Notifikasi sudah dibaca", data: notif });
  } catch (err) {
    console.error("Mark as read error:", err);
    res.status(500).json({ message: "Gagal memperbarui notifikasi" });
  }
};

// Tandai semua notifikasi user sebagai sudah dibaca (opsional, mark-all)
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notifikasi.update(
      { sudah_dibaca: 1 },
      { where: { user_id: userId, sudah_dibaca: 0 } }
    );
    res.json({ message: "Semua notifikasi sudah dibaca" });
  } catch (err) {
    console.error("Mark all as read error:", err);
    res.status(500).json({ message: "Gagal memperbarui semua notifikasi" });
  }
};

// Buat notifikasi baru dan emit ke user via socket.io (untuk pemakaian backend saja)
exports.createNotification = async (data, io) => {
  try {
    const newNotif = await Notifikasi.create({
      user_id: data.user_id,
      pesan: data.pesan,
      link: data.link || null,
      tipe: data.tipe || "info",
      sudah_dibaca: 0, // gunakan angka untuk tinyint(1)
    });

    // Emit realtime ke user tertentu (jangan broadcast global)
    if (io && data.user_id) {
      io.emit(`notifikasi-user-${data.user_id}`, newNotif);
    }

    return newNotif;
  } catch (err) {
    console.error("Create notification error:", err);
    throw err;
  }
};
