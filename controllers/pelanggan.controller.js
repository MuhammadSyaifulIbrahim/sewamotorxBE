const db = require("../models");
const Pelanggan = db.pelanggan;

exports.getAll = async (req, res) => {
  try {
    const data = await Pelanggan.findAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nama, alamat, no_hp } = req.body;
    const data = await Pelanggan.create({ nama, alamat, no_hp });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const pelanggan = await Pelanggan.findByPk(id);
    if (!pelanggan) return res.status(404).json({ message: "Tidak ditemukan" });

    const { nama, alamat, no_hp } = req.body;
    await pelanggan.update({ nama, alamat, no_hp });

    res.json(pelanggan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    const pelanggan = await Pelanggan.findByPk(id);
    if (!pelanggan) return res.status(404).json({ message: "Tidak ditemukan" });

    await pelanggan.destroy();
    res.json({ message: "Pelanggan dihapus" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
