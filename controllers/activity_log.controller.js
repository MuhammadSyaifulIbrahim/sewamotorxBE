const { activityLog, user } = require("../models");

exports.getAllLogs = async (req, res) => {
  try {
    const logs = await activityLog.findAll({
      include: {
        model: user,
        as: "admin", // harus sesuai alias dari associate()
        attributes: ["id", "nama", "email"],
      },
      order: [["createdAt", "DESC"]],
    });

    res.json(logs);
  } catch (err) {
    console.error("❌ ERROR GET LOG:", err.message);
    res.status(500).json({ message: "Gagal mengambil log aktivitas" });
  }
};
