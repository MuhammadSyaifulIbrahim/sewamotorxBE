const { Sequelize, DataTypes } = require("sequelize");
const dbConfig = require("../config/db.config");

// Inisialisasi Sequelize dengan connection pool & retry
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.DIALECT || "mysql",
  port: dbConfig.PORT || 3306,
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    connectTimeout: 60000,
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

db.Kendaraan = require("./kendaraan.model")(sequelize, DataTypes);
db.User = require("./user.model")(sequelize, DataTypes);
db.Penyewaan = require("./penyewaan.model")(sequelize, DataTypes);
db.ActivityLog = require("./activity_log.model")(sequelize, DataTypes);
db.Notifikasi = require("./notifikasi.model")(sequelize, DataTypes);
db.NotifikasiAdmin = require("./notifikasiAdmin.model")(sequelize, DataTypes);
db.Review = require("./review.model")(sequelize, DataTypes);

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
db.User.hasMany(db.Penyewaan, { foreignKey: "userId", as: "penyewaans" });
db.Penyewaan.belongsTo(db.User, { foreignKey: "userId", as: "user" });

// User → ActivityLog
db.User.hasMany(db.ActivityLog, { foreignKey: "adminId", as: "logs" });
db.ActivityLog.belongsTo(db.User, { foreignKey: "adminId", as: "admin" });

// User → Notifikasi
db.User.hasMany(db.Notifikasi, { foreignKey: "user_id", as: "notifikasis" });
db.Notifikasi.belongsTo(db.User, { foreignKey: "user_id", as: "user" });

// User (admin) → NotifikasiAdmin
db.User.hasMany(db.NotifikasiAdmin, {
  foreignKey: "adminId",
  as: "notifikasiAdmins",
});
db.NotifikasiAdmin.belongsTo(db.User, { foreignKey: "adminId", as: "admin" });

// User → Review
db.User.hasMany(db.Review, { foreignKey: "userId", as: "reviews" });
db.Review.belongsTo(db.User, { foreignKey: "userId", as: "user" });

// Kendaraan → Review
db.Kendaraan.hasMany(db.Review, { foreignKey: "kendaraanId", as: "reviews" });
db.Review.belongsTo(db.Kendaraan, {
  foreignKey: "kendaraanId",
  as: "kendaraan",
});

// Penyewaan → Review
db.Penyewaan.hasOne(db.Review, { foreignKey: "penyewaanId", as: "review" });
db.Review.belongsTo(db.Penyewaan, {
  foreignKey: "penyewaanId",
  as: "penyewaan",
});

module.exports = db;
