const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.user;
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Email transporter pakai Gmail (gunakan .env untuk security)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ======================= REGISTER =========================
exports.register = async (req, res) => {
  try {
    const { nama, email, password, role = "user" } = req.body;

    if (!nama || !email || !password) {
      return res.status(400).json({
        message: "Nama, email, dan password wajib diisi.",
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const email_token = crypto.randomBytes(32).toString("hex");

    const newUser = await User.create({
      nama,
      email,
      password: hashedPassword,
      role,
      status: "nonaktif", // default nonaktif
      is_verified: false,
      email_token: email_token,
    });

    // Kirim email verifikasi
    const verifyUrl = `http://localhost:5173/verify?token=${email_token}`;
    await transporter.sendMail({
      to: email,
      subject: "Verifikasi Akun MotoRent",
      html: `
        <p>Halo ${nama},</p>
        <p>Terima kasih sudah mendaftar di MotoRent. Silakan klik link berikut untuk verifikasi akun Anda:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <br><small>Abaikan email ini jika Anda tidak merasa mendaftar.</small>
      `,
    });

    res.status(201).json({
      message: "Registrasi berhasil. Silakan cek email untuk verifikasi akun.",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Gagal mendaftarkan akun." });
  }
};

// ======================== LOGIN ===========================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email dan password wajib diisi.",
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email tidak ditemukan." });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        message: "Akun belum diverifikasi. Silakan cek email untuk verifikasi.",
      });
    }

    if (user.status !== "aktif") {
      return res.status(403).json({
        message: "Akun Anda telah diblokir. Silakan hubungi admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Password salah." });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login berhasil.",
      token,
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login gagal." });
  }
};

// ================ VERIFIKASI EMAIL ==============
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token tidak valid!");

    const user = await User.findOne({ where: { email_token: token } });
    if (!user)
      return res.status(404).send("Token tidak ditemukan atau sudah expired.");

    user.is_verified = true;
    user.status = "aktif";
    user.email_token = null;
    await user.save();

    res.send("Verifikasi berhasil! Akun Anda sudah aktif, silakan login.");
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).send("Terjadi kesalahan saat verifikasi email.");
  }
};

// ======================= FORGOT PASSWORD =========================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email wajib diisi." });

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(200).json({
        message: "Jika email terdaftar, link reset password sudah dikirim.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.reset_token = resetToken;
    user.reset_token_exp = Date.now() + 60 * 60 * 1000; // expire 1 jam
    await user.save();

    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      to: email,
      subject: "Reset Password MotoRent",
      html: `
        <p>Halo ${user.nama},</p>
        <p>Silakan klik link berikut untuk reset password akun Anda:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <br><small>Abaikan email ini jika Anda tidak meminta reset password.</small>
      `,
    });

    res.status(200).json({
      message: "Jika email terdaftar, link reset password sudah dikirim.",
    });
  } catch (err) {
    console.error("Forgot Password error:", err);
    res.status(500).json({ message: "Gagal mengirim reset password." });
  }
};

// ======================= RESET PASSWORD =========================
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token dan password baru wajib diisi." });
    }

    const user = await User.findOne({ where: { reset_token: token } });
    if (!user) {
      return res.status(404).json({
        message: "Token reset password tidak valid atau sudah kadaluarsa.",
      });
    }

    if (user.reset_token_exp < Date.now()) {
      return res
        .status(400)
        .json({ message: "Token reset password sudah kadaluarsa." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.reset_token = null;
    user.reset_token_exp = null;
    await user.save();

    res.json({
      message: "Password berhasil direset. Silakan login dengan password baru.",
    });
  } catch (err) {
    console.error("Reset Password error:", err);
    res.status(500).json({ message: "Gagal mereset password." });
  }
};
