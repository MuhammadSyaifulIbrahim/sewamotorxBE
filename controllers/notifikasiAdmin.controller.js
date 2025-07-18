const db = require("../models");
const NotifikasiAdmin = db.notifikasiAdmin;

exports.getAllByAdmin = async (req, res) => {
  try {
    const adminId = req.user.id;
    const notifs = await NotifikasiAdmin.findAll({
      where: { adminId },
      order: [["createdAt", "DESC"]],
    });
    res.json(notifs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil notifikasi admin" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const adminId = req.user.id;
    const notif = await NotifikasiAdmin.findOne({
      where: { id: req.params.id, adminId },
    });
    if (!notif)
      return res.status(404).json({ message: "Notifikasi tidak ditemukan" });

    notif.is_read = 1; // <- TINYINT
    await notif.save();

    res.json({ message: "Notifikasi sudah dibaca", data: notif });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal memperbarui notifikasi" });
  }
};
