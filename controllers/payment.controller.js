const db = require("../models");
const Penyewaan = db.penyewaan;
const Pelanggan = db.pelanggan;
const Kendaraan = db.kendaraan;

const sendEmail = require("../utils/sendEmail");

exports.webhook = async (req, res) => {
  try {
    const payload = req.body;
    console.log(
      "📩 [WEBHOOK] PAYLOAD MASUK:\n",
      JSON.stringify(payload, null, 2)
    );

    const external_id =
      payload.reference_id ||
      payload.external_id ||
      payload.data?.reference_id ||
      payload.data?.external_id ||
      payload.data?.id;

    const status =
      payload.status || payload.data?.status || payload?.invoice?.status;

    const payment_method =
      payload.payment_method || payload.data?.payment_method;
    const payment_channel =
      payload.payment_channel || payload.data?.payment_channel;

    if (!external_id || !status) {
      console.warn("⚠️ Data kurang: external_id/status");
      return res.status(400).json({ message: "Data webhook tidak lengkap" });
    }

    console.log("🔍 external_id:", external_id);
    console.log("🔍 status:", status);

    const penyewaan = await Penyewaan.findOne({ where: { external_id } });

    if (!penyewaan) {
      console.warn("❗ Penyewaan tidak ditemukan. external_id:", external_id);
      return res.status(404).json({ message: "Penyewaan tidak ditemukan" });
    }

    const metodeBayar = payment_channel || payment_method || "TIDAK DIKETAHUI";

    switch (status.toUpperCase()) {
      case "PAID":
      case "SUCCEEDED":
        penyewaan.status = "BERHASIL";

        // 🔔 Kirim email ke pelanggan
        try {
          const pelanggan = await Pelanggan.findByPk(penyewaan.pelanggan_id);
          const kendaraan = await Kendaraan.findByPk(penyewaan.kendaraan_id);

          if (pelanggan && pelanggan.email) {
            const subject = "Transaksi Berhasil - MotoRent";
            const html = `
              <h3>Halo ${pelanggan.nama},</h3>
              <p>Transaksi penyewaan motor Anda telah <strong>BERHASIL</strong>.</p>
              <p><strong>Detail Transaksi:</strong></p>
              <ul>
                <li>Motor: ${kendaraan?.nama || "-"}</li>
                <li>Tanggal Sewa: ${penyewaan.tanggal_mulai || "-"}</li>
                <li>Durasi: ${penyewaan.lama_sewa || "-"} hari</li>
                <li>Total Bayar: Rp${penyewaan.total_bayar || "-"}</li>
                <li>Metode Pembayaran: ${metodeBayar}</li>
              </ul>
              <p>Terima kasih telah menggunakan <strong>RentalMotor.id</strong>!</p>
            `;

            await sendEmail(pelanggan.email, subject, html);
            console.log(
              "📧 Email notifikasi berhasil dikirim ke:",
              pelanggan.email
            );
          } else {
            console.warn("⚠️ Email pelanggan tidak tersedia");
          }
        } catch (emailErr) {
          console.error(
            "❌ Gagal mengirim email notifikasi:",
            emailErr.message
          );
        }

        break;

      case "EXPIRED":
      case "FAILED":
        penyewaan.status = "GAGAL";
        break;

      case "CANCELLED":
        penyewaan.status = "DIBATALKAN";
        break;

      default:
        penyewaan.status = "MENUNGGU_PEMBAYARAN";
        break;
    }

    penyewaan.metode_pembayaran = metodeBayar;
    await penyewaan.save();

    console.log("✅ Webhook sukses update:", {
      external_id,
      status: penyewaan.status,
      metode_pembayaran: penyewaan.metode_pembayaran,
    });

    return res.status(200).json({ message: "Webhook berhasil diproses" });
  } catch (err) {
    console.error("❌ ERROR Webhook:", err.message);
    console.error(err.stack);
    return res.status(500).json({
      message: "Server error saat memproses webhook",
      error: err.message,
    });
  }
};
