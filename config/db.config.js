require("dotenv").config();

module.exports = {
  HOST: process.env.DB_HOST,
  USER: process.env.DB_USER,
  PASSWORD: process.env.DB_PASSWORD,
  DB: process.env.DB_NAME,
  DIALECT: process.env.DIALECT || "mysql", // ✅ fallback jaga-jaga
  PORT: process.env.DB_PORT || 3306,
};
