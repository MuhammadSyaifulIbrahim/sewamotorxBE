// cron/reminderJob.js

const cron = require("node-cron");
const { penyewaan, user, kendaraan } = require("../models");
const { Op } = require("sequelize");
const sendEmail = require("../utils/sendEmail");
const reminderTemplate = require("../templates/reminderTemplate");

async function kirimReminderHarian() {
  const now = new Date();
  const besok = new Date(now);
  besok.setDate(besok.getDate() + 1);

  const start = new Date(besok.setHours(0, 0, 0, 0));
  const end = new Date(besok.setHours(23, 59, 59, 999));

  try {
    const bookings = await penyewaan.findAll({
      where: {
        jam_pengambilan: { [Op.between]: [start, end] },
        status: "BERHASIL",
      },
      include: [
        { model: user, as: "user", attributes: ["email", "nama"] },
        { model: kendaraan, as: "kendaraan", attributes: ["nama"] },
      ],
    });

    if (bookings.length === 0) {
      console.log("📭 Tidak ada penyewaan yang perlu diingatkan hari ini.");
      return;
    }

    console.log(`🔎 Ditemukan ${bookings.length} penyewaan untuk diingatkan.`);

    for (const booking of bookings) {
      const namaPenyewa =
        booking.nama_penyewa || booking.user?.nama || "Penyewa";
      const namaMotor = booking.kendaraan?.nama || "Motor";
      const jamPengambilan = new Date(booking.jam_pengambilan).toLocaleString(
        "id-ID",
        {
          dateStyle: "full",
          timeStyle: "short",
        }
      );

      const { subject, html } = reminderTemplate({
        namaPenyewa,
        namaMotor,
        jamPengambilan,
      });

      try {
        await sendEmail(booking.user.email, subject, html);
        console.log(`✅ Reminder terkirim ke ${booking.user.email}`);
      } catch (err) {
        console.error(`❌ Gagal kirim ke ${booking.user.email}:`, err.message);
      }
    }
  } catch (error) {
    console.error("❌ Gagal menjalankan job reminder:", error.message);
  }
}

// Jadwalkan job setiap hari jam 07:00 pagi
cron.schedule("0 7 * * *", () => {
  console.log("⏰ Menjalankan reminder penyewaan (07:00 setiap hari)...");
  kirimReminderHarian();
});
