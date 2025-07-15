require("dotenv").config();
const axios = require("axios");

const XENDIT_API_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_BASE_URL = "https://api.xendit.co/v2/invoices";

// Error jika API Key belum ada
if (!XENDIT_API_KEY) {
  throw new Error("❌ XENDIT_SECRET_KEY tidak ditemukan di .env");
}

/**
 * Membuat invoice pembayaran menggunakan Xendit
 * @param {Object} param0
 * @param {string} param0.externalID
 * @param {string} param0.payerEmail
 * @param {string} param0.description
 * @param {number} param0.amount
 * @param {string} param0.redirectURL
 * @param {number} [param0.expiryDuration=900] - Waktu kadaluarsa dalam detik
 * @returns {Promise<Object>}
 */
const createInvoice = async ({
  externalID,
  payerEmail,
  description,
  amount,
  redirectURL,
  expiryDuration = 900,
}) => {
  try {
    if (
      !externalID ||
      !payerEmail ||
      !description ||
      typeof amount !== "number" ||
      amount <= 0 ||
      !redirectURL
    ) {
      throw new Error(
        "❌ Parameter createInvoice tidak lengkap atau amount tidak valid"
      );
    }
    console.log("📦 Invoice amount yang dikirim ke Xendit:", amount);

    if (isNaN(amount) || amount <= 0) {
      throw new Error("❌ Nominal amount tidak valid");
    }

    console.log("📤 Mengirim request invoice ke Xendit...");

    const response = await axios.post(
      XENDIT_BASE_URL,
      {
        external_id: externalID,
        payer_email: payerEmail,
        description,
        amount,
        invoice_duration: expiryDuration,
        success_redirect_url: redirectURL,
      },
      {
        auth: {
          username: XENDIT_API_KEY,
          password: "", // kosong
        },
      }
    );

    console.log("✅ Invoice berhasil dibuat. Status:", response.status);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error("❌ Xendit API Error:", error.response.data);
    } else {
      console.error("❌ Request Error:", error.message);
    }

    throw new Error(
      "Gagal membuat invoice dengan Xendit. Coba beberapa saat lagi."
    );
  }
};

module.exports = { createInvoice };
