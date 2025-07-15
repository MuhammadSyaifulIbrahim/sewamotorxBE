// models/index.js

const { Sequelize, DataTypes } = require("sequelize");
const dbConfig = require("../config/db.config");

// Inisialisasi Sequelize
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.DIALECT || "mysql",
  port: dbConfig.PORT || 3306,
  logging: false,
});

// Tes koneksi database
sequelize
  .authenticate()
  .then(() => console.log("✅ Koneksi database sukses!"))
  .catch((err) => console.error("❌ Koneksi error:", err));

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// =============================
// Registrasi Semua Model
// =============================

db.kendaraan = require("./kendaraan.model")(sequelize, DataTypes);
db.user = require("./user.model")(sequelize, DataTypes);
db.penyewaan = require("./penyewaan.model")(sequelize, DataTypes);
db.activityLog = require("./activity_log.model")(sequelize, DataTypes);

// === Tambahkan Model Pengiriman ===
db.pengiriman = require("./pengiriman")(sequelize, DataTypes); // Pastikan nama file: pengiriman.js

// =============================
// RELASI antar Model
// =============================

// Kendaraan → Penyewaan
db.kendaraan.hasMany(db.penyewaan, {
  foreignKey: "kendaraan_id",
  as: "penyewaans",
});
db.penyewaan.belongsTo(db.kendaraan, {
  foreignKey: "kendaraan_id",
  as: "kendaraan",
});

// User → Penyewaan
db.user.hasMany(db.penyewaan, {
  foreignKey: "userId",
  as: "penyewaans",
});
db.penyewaan.belongsTo(db.user, {
  foreignKey: "userId",
  as: "user",
});

// User → ActivityLog (admin mencatat aksi)
db.user.hasMany(db.activityLog, {
  foreignKey: "adminId",
  as: "logs",
});
db.activityLog.belongsTo(db.user, {
  foreignKey: "adminId",
  as: "admin",
});

// ==== RELASI PENGIRIMAN ====
// Pengiriman → Penyewaan
db.pengiriman.belongsTo(db.penyewaan, {
  foreignKey: "penyewaan_id",
  as: "penyewaan",
});
db.penyewaan.hasMany(db.pengiriman, {
  foreignKey: "penyewaan_id",
  as: "pengirimans",
});

// (Optional) Pengiriman → User (admin input)
db.pengiriman.belongsTo(db.user, {
  foreignKey: "admin_id",
  as: "admin",
});
db.user.hasMany(db.pengiriman, {
  foreignKey: "admin_id",
  as: "pengirimans",
});

module.exports = db;
