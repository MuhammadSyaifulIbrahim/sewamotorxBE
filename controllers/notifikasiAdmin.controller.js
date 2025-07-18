const db = require("../models");
const NotifikasiAdmin = db.notifikasiAdmin;

// Ambil semua notifikasi admin berdasarkan adminId
exports.getAllByAdmin = async (req, res) => {
  try {
    const adminId = req.user.id;
    const notifs = await NotifikasiAdmin.findAll({
      where: { adminId },
      order: [["createdAt", "DESC"]],
    });
    res.json(notifs);
  } catch (err) {
    console.error("Error getAllByAdmin:", err);
    res.status(500).json({ message: "Gagal mengambil notifikasi admin" });
  }
};

// Tandai notifikasi admin sudah dibaca
exports.markAsRead = async (req, res) => {
  try {
    const adminId = req.user.id;
    const notifId = req.params.id;

    // Cari notifikasi yang sesuai dan milik admin terkait
    const notif = await NotifikasiAdmin.findOne({
      where: { id: notifId, adminId },
    });
    if (!notif) {
      return res.status(404).json({ message: "Notifikasi tidak ditemukan" });
    }

    await NotifikasiAdmin.update(
      { is_read: true },
      { where: { id: notifId, adminId } }
    );

    res.json({ message: "Notifikasi sudah dibaca", data: notif });
  } catch (err) {
    console.error("Error markAsRead:", err);
    res.status(500).json({ message: "Gagal memperbarui notifikasi" });
  }
};

// Tambah notifikasi admin (misal dari event backend)
exports.createAdminNotif = async (data, io) => {
  try {
    // Data: { adminId, title, message }
    const notif = await NotifikasiAdmin.create({
      adminId: data.adminId,
      title: data.title || "",
      message: data.message,
      is_read: false,
    });

    // Opsional: emit notifikasi ke admin tertentu via socket
    if (io && data.adminId) {
      io.emit(`notifikasi-admin-${data.adminId}`, notif);
    }

    return notif;
  } catch (err) {
    console.error("Error createAdminNotif:", err);
    throw err;
  }
};
