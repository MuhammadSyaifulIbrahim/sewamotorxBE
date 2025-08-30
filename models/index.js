// models/index.js

const { Sequelize, DataTypes } = require("sequelize");
const dbConfig = require("../config/db.config");

// Inisialisasi Sequelize dengan connection pool & retry
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.DIALECT || "mysql",
  port: dbConfig.PORT || 3306,
  logging: false,
  pool: {
    max: 10, // jumlah maksimum koneksi
    min: 0, // minimum koneksi
    acquire: 30000, // waktu maksimum untuk mendapatkan koneksi (ms)
    idle: 10000, // waktu idle sebelum koneksi ditutup (ms)
  },
  dialectOptions: {
    connectTimeout: 60000, // timeout koneksi (ms)
  },
});

// Fungsi untuk auto-reconnect jika koneksi gagal
async function connectWithRetry() {
  try {
    await sequelize.authenticate();
    console.log("✅ Koneksi database sukses!");
  } catch (err) {
    console.error("❌ Koneksi error:", err.message);
    console.log("🔄 Mencoba ulang koneksi dalam 5 detik...");
    setTimeout(connectWithRetry, 5000);
  }
}

connectWithRetry();

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
db.user.hasMany(db.penyewaan, { foreignKey: "userId", as: "penyewaans" });
db.penyewaan.belongsTo(db.user, { foreignKey: "userId", as: "user" });

// User → ActivityLog
db.user.hasMany(db.activityLog, { foreignKey: "adminId", as: "logs" });
db.activityLog.belongsTo(db.user, { foreignKey: "adminId", as: "admin" });

// User → Notifikasi
db.user.hasMany(db.notifikasi, { foreignKey: "user_id", as: "notifikasis" });
db.notifikasi.belongsTo(db.user, { foreignKey: "user_id", as: "user" });

// User (admin) → NotifikasiAdmin
db.user.hasMany(db.notifikasiAdmin, {
  foreignKey: "adminId",
  as: "notifikasiAdmins",
});
db.notifikasiAdmin.belongsTo(db.user, { foreignKey: "adminId", as: "admin" });

// User → Review
db.user.hasMany(db.Review, { foreignKey: "userId", as: "reviews" });
db.Review.belongsTo(db.user, { foreignKey: "userId", as: "user" });

// Kendaraan → Review
db.kendaraan.hasMany(db.Review, { foreignKey: "kendaraanId", as: "reviews" });
db.Review.belongsTo(db.kendaraan, {
  foreignKey: "kendaraanId",
  as: "kendaraan",
});

// Penyewaan → Review
db.penyewaan.hasOne(db.Review, { foreignKey: "penyewaanId", as: "review" });
db.Review.belongsTo(db.penyewaan, {
  foreignKey: "penyewaanId",
  as: "penyewaan",
});

module.exports = db;
