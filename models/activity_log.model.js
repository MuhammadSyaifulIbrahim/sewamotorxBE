// models/activity_log.model.js
module.exports = (sequelize, DataTypes) => {
  const ActivityLog = sequelize.define(
    "ActivityLog",
    {
      adminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "activity_logs",
      timestamps: true,
    }
  );

  ActivityLog.associate = function (models) {
    // Jika kamu punya model admin, relasikan di sini
    ActivityLog.belongsTo(models.User, {
      foreignKey: "adminId",
      as: "admin",
    });
  };

  return ActivityLog;
};
