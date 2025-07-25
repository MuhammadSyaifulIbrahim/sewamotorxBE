// models/notifikasiAdmin.js
module.exports = (sequelize, DataTypes) => {
  const NotifikasiAdmin = sequelize.define("notifikasiAdmin", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    adminId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.TINYINT, defaultValue: 0 }, // <- PENTING!
  });
  return NotifikasiAdmin;
};
