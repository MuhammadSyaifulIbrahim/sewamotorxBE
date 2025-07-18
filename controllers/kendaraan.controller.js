const db = require("../models");
const Kendaraan = db.kendaraan;
const cloudinary = require("../utils/cloudinary");
const streamifier = require("streamifier");
const { Op } = require("sequelize");

// Fungsi upload via buffer (untuk Cloudinary)
const uploadBufferToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "sewamotor/kendaraan" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// GET semua kendaraan
const getAll = async (req, res) => {
  try {
    const data = await Kendaraan.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(data);
  } catch (err) {
    console.error("GET error:", err);
    res.status(500).json({ message: "Gagal mengambil data kendaraan" });
  }
};

// GET kendaraan by ID
const getById = async (req, res) => {
  try {
    const kendaraan = await Kendaraan.findByPk(req.params.id);
    if (!kendaraan)
      return res.status(404).json({ message: "Data tidak ditemukan" });
    res.json(kendaraan);
  } catch (err) {
    console.error("GET by ID error:", err);
    res.status(500).json({ message: "Gagal mengambil data" });
  }
};

// CREATE kendaraan dengan emit socket event
const create = async (req, res) => {
  try {
    const { nama, tipe, transmisi, harga_sewa, stok, diskon, gpsId, gpsUrl } =
      req.body;

    const parsedDiskon = parseInt(diskon);
    if (isNaN(parsedDiskon) || parsedDiskon < 0 || parsedDiskon > 100) {
      return res
        .status(400)
        .json({ message: "Diskon harus berupa angka antara 0 - 100" });
    }

    let gambar_url = null;
    let qrImage_url = null;

    if (req.files?.gambar) {
      const result = await uploadBufferToCloudinary(req.files.gambar[0].buffer);
      gambar_url = result.secure_url;
    }
    if (req.files?.qrImage) {
      const qrResult = await uploadBufferToCloudinary(
        req.files.qrImage[0].buffer
      );
      qrImage_url = qrResult.secure_url;
    }

    const newData = await Kendaraan.create({
      nama,
      tipe,
      transmisi,
      harga_sewa,
      stok,
      diskon: parsedDiskon,
      gambar: gambar_url,
      gpsId,
      gpsUrl,
      qrImage: qrImage_url,
      status: "tersedia",
    });

    // Emit event realtime ke client
    const io = req.app.get("io");
    if (io) io.emit("produk:created", newData);

    res.status(201).json(newData);
  } catch (err) {
    console.error("Create error:", err);
    res
      .status(500)
      .json({ message: "Gagal menambahkan kendaraan", error: err.message });
  }
};

// UPDATE kendaraan dengan emit socket event
const update = async (req, res) => {
  try {
    const { nama, tipe, transmisi, harga_sewa, stok, diskon, gpsId, gpsUrl } =
      req.body;

    const kendaraan = await Kendaraan.findByPk(req.params.id);
    if (!kendaraan)
      return res.status(404).json({ message: "Data tidak ditemukan" });

    let parsedDiskon;
    if (diskon === undefined || diskon === null || diskon === "") {
      parsedDiskon = kendaraan.diskon;
    } else {
      parsedDiskon = parseInt(diskon);
      if (isNaN(parsedDiskon) || parsedDiskon < 0 || parsedDiskon > 100) {
        return res
          .status(400)
          .json({ message: "Diskon harus berupa angka antara 0 - 100" });
      }
    }

    let gambarBaru = kendaraan.gambar;
    let qrImageBaru = kendaraan.qrImage;

    if (req.files?.gambar) {
      const result = await uploadBufferToCloudinary(req.files.gambar[0].buffer);
      gambarBaru = result.secure_url;
    }
    if (req.files?.qrImage) {
      const qrResult = await uploadBufferToCloudinary(
        req.files.qrImage[0].buffer
      );
      qrImageBaru = qrResult.secure_url;
    }

    await kendaraan.update({
      nama: nama ?? kendaraan.nama,
      tipe: tipe ?? kendaraan.tipe,
      transmisi: transmisi ?? kendaraan.transmisi,
      harga_sewa: harga_sewa ?? kendaraan.harga_sewa,
      stok: stok ?? kendaraan.stok,
      diskon: parsedDiskon,
      gambar: gambarBaru,
      gpsId: gpsId ?? kendaraan.gpsId,
      gpsUrl: gpsUrl ?? kendaraan.gpsUrl,
      qrImage: qrImageBaru,
    });

    // Emit event realtime ke client
    const io = req.app.get("io");
    if (io) io.emit("produk:updated", kendaraan);

    res.json({ message: "Kendaraan berhasil diupdate", data: kendaraan });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({
      message: "Gagal memperbarui kendaraan",
      error: err.message,
    });
  }
};

// DELETE kendaraan dengan emit socket event
const remove = async (req, res) => {
  try {
    const kendaraan = await Kendaraan.findByPk(req.params.id);
    if (!kendaraan)
      return res.status(404).json({ message: "Data tidak ditemukan" });

    await kendaraan.destroy();

    // Emit event realtime ke client user
    const io = req.app.get("io");
    if (io) io.emit("produk:deleted", kendaraan.id);

    res.json({ message: "Kendaraan berhasil dihapus" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Gagal menghapus kendaraan" });
  }
};

// GET Only Kendaraan With GPS Data
const getMotorsWithGps = async (req, res) => {
  try {
    const data = await Kendaraan.findAll({
      where: {
        gpsId: { [Op.ne]: null, [Op.not]: "" },
      },
      order: [["createdAt", "DESC"]],
    });
    res.json(data);
  } catch (err) {
    console.error("GET GPS error:", err);
    res.status(500).json({ message: "Gagal mengambil data tracking" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getMotorsWithGps,
};
