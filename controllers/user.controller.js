const { user: User } = require("../models");
const logActivity = require("../utils/logActivity"); // helper logger

// Ambil semua user dengan role "user"
exports.getAllUsers = async (_req, res) => {
  try {
    const users = await User.findAll({
      where: { role: "user" },
      attributes: ["id", "nama", "email", "status", "role"],
    });
    res.json(users);
  } catch (err) {
    console.error("❌ Gagal ambil data pengguna:", err);
    res.status(500).json({ message: "Gagal memuat pengguna" });
  }
};

// Toggle status user: aktif <-> nonaktif
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id; // ID admin yang login

    const targetUser = await User.findByPk(id);

    if (!targetUser) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    // Tidak boleh blokir admin
    if (targetUser.role === "admin") {
      return res.status(403).json({ message: "Tidak bisa memblokir admin." });
    }

    // Tidak boleh blokir diri sendiri
    if (targetUser.id === currentUserId) {
      return res
        .status(403)
        .json({ message: "Tidak bisa memblokir akun sendiri." });
    }

    // Tentukan status baru
    const newStatus = targetUser.status === "aktif" ? "nonaktif" : "aktif";

    await targetUser.update({ status: newStatus });

    // ✅ Log aktivitas admin
    const action = newStatus === "aktif" ? "Aktifkan Akun" : "Blokir Akun";
    const desc = `Admin ${action.toLowerCase()} untuk user ${
      targetUser.nama
    } (${targetUser.email})`;
    await logActivity(currentUserId, action, desc);

    res.json({
      message: `User berhasil di${
        newStatus === "aktif" ? "aktifkan" : "blokir"
      }.`,
      status: newStatus,
    });
  } catch (err) {
    console.error("❌ Gagal toggle status user:", err);
    res.status(500).json({
      message: "Terjadi kesalahan saat mengubah status pengguna.",
    });
  }
};
