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
      },
      penyewaanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      kendaraanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "Reviews",
    }
  );

  Review.associate = (models) => {
    Review.belongsTo(models.User, { foreignKey: "userId" });
    Review.belongsTo(models.Penyewaan, { foreignKey: "penyewaanId" });
    Review.belongsTo(models.Kendaraan, { foreignKey: "kendaraanId" });
  };

  return Review;
};
