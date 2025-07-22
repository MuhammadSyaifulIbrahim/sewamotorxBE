// models/review.model.js

module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define(
    "Review",
    {
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      pesan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id", // optional, jika di DB pakai snake_case
      },
      penyewaanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "penyewaan_id", // optional, jika di DB pakai snake_case
      },
      kendaraanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "kendaraan_id", // optional, jika di DB pakai snake_case
      },
    },
    {
      tableName: "Reviews",
      timestamps: true, // true jika mau pakai createdAt/updatedAt
    }
  );

  // Relasi di sini hanya *perlu* jika kamu butuh include pada query
  Review.associate = (models) => {
    Review.belongsTo(models.user, { foreignKey: "userId", as: "user" });
    Review.belongsTo(models.penyewaan, {
      foreignKey: "penyewaanId",
      as: "penyewaan",
    });
    Review.belongsTo(models.kendaraan, {
      foreignKey: "kendaraanId",
      as: "kendaraan",
    });
  };

  return Review;
};
