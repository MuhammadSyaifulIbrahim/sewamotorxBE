// models/penyewaan.js

module.exports = (sequelize, DataTypes) => {
  const Penyewaan = sequelize.define("penyewaan", {
    kendaraan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nama_penyewa: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nomor_telepon: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isNumeric: true,
      },
    },
    jadwal_booking: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    jam_pengambilan: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    jam_pengembalian: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    durasi_hari: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    metode_pengambilan: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["Diambil", "Diantar", "Showroom"]],
      },
    },
    metode_pengembalian: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isIn: [["Showroom", "Diambil"]],
      },
    },
    alamat_pengambilan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    alamat_pengembalian: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    keterangan: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    foto_ktp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    foto_sim: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "MENUNGGU_PEMBAYARAN",
        "BERHASIL",
        "GAGAL",
        "DIBATALKAN",
        "SELESAI",
        "DALAM PENYEWAAN"
      ),
      defaultValue: "MENUNGGU_PEMBAYARAN",
      allowNull: false,
    },
    payment_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    external_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    xendit_invoice_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metode_pembayaran: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    harga_total: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    // === Ongkir fields ===
    ongkir_antar: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    ongkir_jemput: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    // === Tracking status pengiriman ===
    status_pesanan: {
      type: DataTypes.ENUM(
        "Sedang Dikemas",
        "Segera Ambil di Showroom",
        "Dikirim",
        "Telah Sampai di Tempat Customer",
        "Proses Pengambilan Motor Sewa di Tempat Customer",
        "Selesai Pengambilan Motor dari Tempat Customer"
      ),
      allowNull: false,
      defaultValue: "Sedang Dikemas",
    },

    bukti_penerimaan: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bukti_pengembalian: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  return Penyewaan;
};
