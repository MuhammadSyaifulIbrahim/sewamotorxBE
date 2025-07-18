module.exports = (sequelize, DataTypes) => {
  const Notifikasi = sequelize.define("notifikasi", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pesan: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tipe: {
      type: DataTypes.STRING,
      defaultValue: "info",
    },
    sudah_dibaca: {
      type: DataTypes.TINYINT,
      defaultValue: 0,
    },
  });

  return Notifikasi;
};
