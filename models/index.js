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

db.Kendaraan = require("./kendaraan.model")(sequelize, DataTypes);
db.User = require("./user.model")(sequelize, DataTypes);
db.Penyewaan = require("./penyewaan.model")(sequelize, DataTypes);
db.ActivityLog = require("./activity_log.model")(sequelize, DataTypes);
db.Pengiriman = require("./pengiriman")(sequelize, DataTypes);

// =============================
// RELASI antar Model
// =============================

// Kendaraan → Penyewaan
db.Kendaraan.hasMany(db.Penyewaan, {
  foreignKey: "kendaraan_id",
  as: "penyewaans",
});
db.Penyewaan.belongsTo(db.Kendaraan, {
  foreignKey: "kendaraan_id",
  as: "kendaraan",
});

// User → Penyewaan
db.User.hasMany(db.Penyewaan, {
  foreignKey: "userId",
  as: "penyewaans",
});
db.Penyewaan.belongsTo(db.User, {
  foreignKey: "userId",
  as: "user",
});

// User → ActivityLog
db.User.hasMany(db.ActivityLog, {
  foreignKey: "adminId",
  as: "logs",
});
db.ActivityLog.belongsTo(db.User, {
  foreignKey: "adminId",
  as: "admin",
});

// Pengiriman → Penyewaan
db.Pengiriman.belongsTo(db.Penyewaan, {
  foreignKey: "penyewaan_id",
  as: "penyewaan",
});
db.Penyewaan.hasMany(db.Pengiriman, {
  foreignKey: "penyewaan_id",
  as: "pengirimans",
});

// Pengiriman → User (admin input)
db.Pengiriman.belongsTo(db.User, {
  foreignKey: "admin_id",
  as: "admin",
});
db.User.hasMany(db.Pengiriman, {
  foreignKey: "admin_id",
  as: "pengirimans",
});

module.exports = db;
