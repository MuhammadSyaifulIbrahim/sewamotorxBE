// models/pelanggan.js
module.exports = (sequelize, DataTypes) => {
  const Pelanggan = sequelize.define("pelanggan", {
    nama: DataTypes.STRING,
    nomor_telepon: DataTypes.STRING,
    alamat: DataTypes.STRING,
    foto_ktp: DataTypes.STRING,
    userId: DataTypes.INTEGER,
  });

  Pelanggan.associate = (models) => {
    Pelanggan.hasMany(models.penyewaan);
  };

  return Pelanggan;
};
