// ====================
// app.js (with socket.io)
// ====================
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const methodOverride = require("method-override");
const db = require("./models");

// Tambahan socket.io
const http = require("http");
const socketIo = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());
app.use(methodOverride("_method"));

// ====================
// Routes
// ====================
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/kendaraan", require("./routes/kendaraan.routes"));
app.use("/api/penyewaan", require("./routes/penyewaan.routes"));
app.use("/api/pelanggan", require("./routes/pelanggan.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/activity-logs", require("./routes/activity_log.routes"));

// ✅ Webhook Xendit
const paymentController = require("./controllers/payment.controller");
app.post("/xendit-callback", paymentController.webhook);

// ✅ Tambahan route untuk Google Maps jarak
app.use("/api/maps", require("./routes/maps.routes"));

const PORT = process.env.PORT || 3001;

// DEVELOPMENT MODE: AUTO RESET DB
const forceSync = process.env.NODE_ENV !== "production";

// ========== SOCKET.IO SETUP ==========
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }, // adjust if needed
});

// Simpan io instance di app agar bisa diakses di controller
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket client connected:", socket.id);

  // Contoh event custom (opsional)
  socket.on("test-ping", (msg) => {
    console.log("Dapat pesan dari client:", msg);
    socket.emit("test-pong", { ok: true, waktu: new Date() });
  });

  socket.on("disconnect", () => {
    console.log("Socket client disconnected:", socket.id);
  });
});

// =====================================

// Sync Database dan buat akun admin jika belum ada
db.sequelize
  .sync({ force: forceSync, alter: !forceSync })
  .then(async () => {
    console.log(`✅ DB sync [force: ${forceSync}]`);

    if (!forceSync) {
      console.log(
        "ℹ️ Production mode: admin tidak dibuat otomatis. Buat manual lewat database hosting."
      );
    } else {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (adminEmail && adminPassword) {
        const adminDefaults = {
          nama: "Admin Rental",
          username: "admin",
          email: adminEmail,
          password: bcrypt.hashSync(adminPassword, 10),
          role: "admin",
          status: "aktif",
          email_verified: true,
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

    // Cron job aktifkan
    require("./cron/reminderJob");

    // Start server (pakai server.listen agar socket jalan!)
    server.listen(PORT, () => {
      console.log(`🚀 Server & socket.io running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("\n❌ DB Sync Error:", err.message);
    if (
      err.name === "SequelizeForeignKeyConstraintError" ||
      (err.parent && err.parent.code === "ER_NO_REFERENCED_ROW_2")
    ) {
      console.error(
        "\n🚨 FOREIGN KEY ERROR:\n" +
          "Ada data penyewaan yang userId-nya tidak ada di tabel Users.\n" +
          "1. Kalau dev, aktifkan forceSync\n" +
          "2. Kalau production, hapus data error sebelum migrate\n"
      );
    }
    process.exit(1);
  });
