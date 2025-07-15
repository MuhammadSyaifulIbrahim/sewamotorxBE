// middleware/auth.middleware.js
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "default_secret";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      console.error("Token tidak valid:", err.message);
      return res.status(403).json({ message: "Token tidak valid" });
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res
        .status(403)
        .json({ message: "Akses ditolak, peran tidak sesuai" });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
};
