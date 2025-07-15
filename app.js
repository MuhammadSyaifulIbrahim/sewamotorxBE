const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const methodOverride = require("method-override");
const db = require("./models");

const app = express();

app.use(cors());
app.use(express.json());
app.use(methodOverride("_method"));

// ===============================
// Routes
// ===============================
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/kendaraan", require("./routes/kendaraan.routes"));
app.use("/api/penyewaan", require("./routes/penyewaan.routes"));
app.use("/api/pelanggan", require("./routes/pelanggan.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/payment", require("./routes/payment.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/activity-logs", require("./routes/activity_log.routes"));
app.use("/api/pengiriman", require("./routes/pengiriman.routes"));

const PORT = process.env.PORT || 3001;

// DEVELOPMENT MODE: AUTO RESET DB (GAMPANG! HAPUS DATA)
const forceSync = process.env.NODE_ENV !== "production";

// Sync Database dan buat akun admin jika belum ada
db.sequelize
  .sync({ force: forceSync, alter: !forceSync })
  .then(async () => {
    console.log(`✅ DB sync [force: ${forceSync}]`);

    // Auto-create admin hanya di development
    if (!forceSync) {
      console.log(
        "ℹ️ Production mode: admin tidak dibuat otomatis. Buat manual lewat database hosting."
      );
    } else {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminEmail && adminPassword) {
        // === TAMBAHKAN FIELD VERIFIED SESUAI MODEL ===
        const adminDefaults = {
          nama: "Admin Rental",
          username: "admin",
          email: adminEmail,
          password: bcrypt.hashSync(adminPassword, 10),
          role: "admin",
          status: "aktif",
          // GANTI SESUAI FIELD DI MODEL KAMU:
          email_verified: true, // atau verified: true, atau is_verified: true
        };

        const [admin, created] = await db.user.findOrCreate({
          where: { email: adminEmail },
          defaults: adminDefaults,
        });

        if (created) {
          console.log("✅ Akun admin berhasil dibuat (DEVELOPMENT MODE).");
        } else {
          console.log("ℹ️ Akun admin sudah tersedia.");
        }
      } else {
        console.warn("⚠️ ADMIN_EMAIL dan ADMIN_PASSWORD belum diset di .env");
      }
    }

    // Aktifkan Cron Job Reminder
    require("./cron/reminderJob");

    // Start Server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // Kasih warning jelas jika sync gagal karena foreign key
    console.error("\n❌ DB Sync Error:", err.message);
    if (
      err.name === "SequelizeForeignKeyConstraintError" ||
      (err.parent && err.parent.code === "ER_NO_REFERENCED_ROW_2")
    ) {
      console.error(
        "\n🚨 TERJADI FOREIGN KEY ERROR!\n" +
          "Ada data di tabel relasi (misal: penyewaan) yang userId-nya tidak ada di tabel Users.\n" +
          "1. Jika di development, aktifkan forceSync (sync({ force: true })) supaya reset DB\n" +
          "2. Jika di production, hapus data bermasalah dari DB sebelum sync/migrate\n"
      );
    }
    process.exit(1);
  });
