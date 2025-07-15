// templates/reminderTemplate.js

module.exports = function reminderTemplate({
  namaPenyewa,
  namaMotor,
  jamPengambilan,
}) {
  const subject = "📅 Reminder Penyewaan Motor";

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto;">
      <h2 style="color: #2B6CB0;">📅 Reminder Penyewaan Motor</h2>
      <p>Halo <strong>${namaPenyewa}</strong>,</p>
      <p>
        Ini pengingat bahwa kamu akan mulai menyewa motor <strong>${namaMotor}</strong> pada:
      </p>
      <p style="font-size: 16px; color: #333;"><strong>${jamPengambilan}</strong></p>
      <p>Pastikan membawa <strong>KTP dan SIM</strong> saat pengambilan.</p>
      <br/>
      <p style="color: gray;">Salam,</p>
      <p><strong>MotoRent</strong></p>
    </div>
  `;

  return { subject, html }; // ✅ Pastikan ini bentuk string
};
