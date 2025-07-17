// models/activity_log.model.js
module.exports = (sequelize, DataTypes) => {
  const ActivityLog = sequelize.define(
    "activityLog", // Pakai camelCase & singular agar konsisten dgn model lain
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
      tableName: "activity_logs", // Nama tabel di database
      timestamps: true,
      underscored: false, // Jika field di db pakai snake_case, set true
    }
  );

  ActivityLog.associate = function (models) {
    ActivityLog.belongsTo(models.user, {
      foreignKey: "adminId",
      as: "admin",
    });
  };

  return ActivityLog;
};
