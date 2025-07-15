module.exports = (sequelize, DataTypes) => {
  const Kendaraan = sequelize.define("kendaraan", {
    nama: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    tipe: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    transmisi: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [["Manual", "Matic"]],
          msg: "Transmisi harus Manual atau Matic",
        },
      },
    },
    harga_sewa: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: { msg: "Harga sewa harus berupa angka" },
        min: { args: [0], msg: "Harga sewa tidak boleh negatif" },
      },
    },
    diskon: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: { msg: "Diskon harus angka bulat" },
        min: { args: [0], msg: "Diskon tidak boleh negatif" },
        max: { args: [100], msg: "Diskon maksimal 100%" },
      },
    },
    stok: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        isInt: { msg: "Stok harus angka bulat" },
        min: { args: [0], msg: "Stok tidak boleh negatif" },
      },
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "tersedia",
      validate: {
        isIn: {
          args: [["tersedia", "disewa"]],
          msg: "Status harus tersedia atau disewa",
        },
      },
    },
    gambar: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Tambahan untuk GPS Tracking
    gpsId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gpsUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qrImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  Kendaraan.associate = function (models) {
    Kendaraan.hasMany(models.Penyewaan, {
      foreignKey: "kendaraan_id",
      as: "penyewaan",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
  };

  return Kendaraan;
};
