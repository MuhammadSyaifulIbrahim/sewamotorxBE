const nodemailer = require("nodemailer");

// === Konfigurasi transporter SMTP (Gmail) ===
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Mengirim email ke penerima
 * @param {string} to - Alamat email tujuan
 * @param {string} subject - Judul email
 * @param {string} html - Konten HTML email
 * @param {string} [text] - (Opsional) versi teks biasa dari HTML
 * @param {string} [replyTo] - (Opsional) alamat balasan
 * @returns {Promise<Object>} Info pengiriman dari Nodemailer
 */
const sendEmail = async (
  to,
  subject = "Notifikasi dari RentalMotor.id",
  html = "",
  text = "",
  replyTo = undefined
) => {
  if (!to || typeof to !== "string" || !to.includes("@")) {
    console.warn("❌ Email tujuan tidak valid:", to);
    return;
  }

  const plainText = text || html.replace(/<[^>]*>?/gm, ""); // fallback text dari html

  try {
    const info = await transporter.sendMail({
      from: `"RentalMotor.id" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: plainText,
      ...(replyTo && { replyTo }),
    });

    console.log("✅ [SMTP] Email berhasil dikirim");
    console.log("📨 Tujuan     :", to);
    console.log("📝 Subject    :", subject);
    console.log("📬 SMTP Reply :", info.response);
    return info;
  } catch (err) {
    console.error("❌ [SMTP] Gagal mengirim email");
    console.error("🧑‍💻 Tujuan :", to);
    console.error("📝 Subject :", subject);
    console.error("💥 Error   :", err.message);
    throw err;
  }
};

module.exports = sendEmail;
