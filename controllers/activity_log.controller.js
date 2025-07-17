// controllers/activity_log.controller.js

const { activityLog, user } = require("../models");

exports.getAllLogs = async (req, res) => {
  try {
    const logs = await activityLog.findAll({
      include: [
        {
          model: user,
          as: "admin", // alias sesuai index.js
          attributes: ["id", "nama", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Jika hasil bukan array (shouldn't happen), tetap balikin array kosong
    if (!Array.isArray(logs)) return res.json([]);
    res.json(logs);
  } catch (err) {
    console.error("❌ ERROR GET LOG:", err);
    res
      .status(500)
      .json({ message: "Gagal mengambil log aktivitas", error: err.message });
  }
};
