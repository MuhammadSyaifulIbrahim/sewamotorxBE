const nodemailer = require("nodemailer");

// Konfigurasi transport SMTP Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Mengirim email ke user
 * @param {string} to - Alamat email tujuan
 * @param {string} subject - Judul email
 * @param {string} html - Isi HTML email
 * @param {string} [text] - (Opsional) Versi text fallback dari HTML
 * @returns {Promise}
 */
const sendEmail = async (
  to,
  subject = "Notifikasi dari RentalMotor.id",
  html = "",
  text = ""
) => {
  if (!to || typeof to !== "string" || !to.includes("@")) {
    console.error("❌ Email tujuan tidak valid:", to);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"RentalMotor.id" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ""), // fallback text jika tidak disediakan
    });

    console.log("✅ Email berhasil dikirim!");
    console.log("📨 Tujuan:", to);
    console.log("📝 Subject:", subject);
    console.log("📬 Response:", info.response);

    return info;
  } catch (err) {
    console.error("❌ Gagal mengirim email:");
    console.error("🧑‍💻 Email tujuan:", to);
    console.error("📝 Subject:", subject);
    console.error("📄 Error message:", err.message);
    throw err;
  }
};

module.exports = sendEmail;
