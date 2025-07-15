// models/pengiriman.js

module.exports = (sequelize, DataTypes) => {
  const Pengiriman = sequelize.define("pengiriman", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    penyewaan_id: { type: DataTypes.INTEGER, allowNull: false }, // foreign key ke penyewaan
    alamat_tujuan: { type: DataTypes.STRING, allowNull: false },
    jarak_km: { type: DataTypes.FLOAT, allowNull: false },
    biaya: { type: DataTypes.INTEGER, allowNull: false },
    waktu_input: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    admin_id: { type: DataTypes.INTEGER, allowNull: true }, // (opsional, siapa yang input)
  });
  return Pengiriman;
};
