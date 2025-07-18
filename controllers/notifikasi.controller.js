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

// Tandai notifikasi sudah dibaca
exports.markAsRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const notif = await Notifikasi.findByPk(notifId);
    if (!notif)
      return res.status(404).json({ message: "Notifikasi tidak ditemukan" });

    notif.sudah_dibaca = true;
    await notif.save();

    res.json({ message: "Notifikasi sudah dibaca", data: notif });
  } catch (err) {
    console.error("Mark as read error:", err);
    res.status(500).json({ message: "Gagal memperbarui notifikasi" });
  }
};

// Buat notifikasi baru dan emit ke user via socket.io
exports.createNotification = async (data, io) => {
  try {
    const newNotif = await Notifikasi.create({
      user_id: data.user_id,
      pesan: data.pesan,
      link: data.link || null,
      tipe: data.tipe || "info",
      sudah_dibaca: false,
    });

    if (io && data.user_id) {
      io.emit(`notifikasi-user-${data.user_id}`, newNotif);
    }

    return newNotif;
  } catch (err) {
    console.error("Create notification error:", err);
    throw err;
  }
};
