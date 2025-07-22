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
db.notifikasi = require("./notifikasi.model")(sequelize, DataTypes);
db.notifikasiAdmin = require("./notifikasiAdmin.model")(sequelize, DataTypes);

// Reviews User (HARUS di atas relasi!)
db.Review = require("./review.model")(sequelize, Sequelize);

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

// User → Notifikasi (notifikasi user biasa)
db.user.hasMany(db.notifikasi, {
  foreignKey: "user_id",
  as: "notifikasis",
});
db.notifikasi.belongsTo(db.user, {
  foreignKey: "user_id",
  as: "user",
});

// User (admin) → NotifikasiAdmin (notifikasi khusus admin)
db.user.hasMany(db.notifikasiAdmin, {
  foreignKey: "adminId",
  as: "notifikasiAdmins",
});
db.notifikasiAdmin.belongsTo(db.user, {
  foreignKey: "adminId",
  as: "admin",
});

// =============================
// RELASI Review KE User, Kendaraan, Penyewaan
// =============================

// User → Review (user punya banyak review)
db.user.hasMany(db.Review, {
  foreignKey: "userId",
  as: "reviews",
});
db.Review.belongsTo(db.user, {
  foreignKey: "userId",
  as: "user",
});

// Kendaraan → Review (satu motor bisa direview banyak user)
db.kendaraan.hasMany(db.Review, {
  foreignKey: "kendaraanId",
  as: "reviews",
});
db.Review.belongsTo(db.kendaraan, {
  foreignKey: "kendaraanId",
  as: "kendaraan",
});

// Penyewaan → Review (satu penyewaan satu review)
db.penyewaan.hasOne(db.Review, {
  foreignKey: "penyewaanId",
  as: "review",
});
db.Review.belongsTo(db.penyewaan, {
  foreignKey: "penyewaanId",
  as: "penyewaan",
});

// =============================

module.exports = db;
