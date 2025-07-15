const db = require("../models"); // PANGGIL OBJEK db LENGKAP

const logActivity = async (adminId, action, description) => {
  try {
    await db.activityLog.create({
      adminId,
      action,
      description,
    });
  } catch (err) {
    console.error("❌ Gagal mencatat log aktivitas:", err.message);
  }
};

module.exports = logActivity;
