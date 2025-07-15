const db = require("../models");
const Pengiriman = db.pengiriman;
const Penyewaan = db.penyewaan;
const User = db.user;
const Kendaraan = db.kendaraan;

const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

// Tambah data pengiriman (POST /api/pengiriman)
exports.create = async (req, res) => {
  try {
    const { penyewaan_id, alamat_tujuan, jarak_km, biaya } = req.body;
    const admin_id = req.user?.id || null; // (opsional, jika pakai JWT auth)

    if (!penyewaan_id || !alamat_tujuan || !jarak_km || !biaya) {
      return res.status(400).json({ message: "Data tidak lengkap" });
    }

    const data = await Pengiriman.create({
      penyewaan_id,
      alamat_tujuan,
      jarak_km,
      biaya,
      waktu_input: new Date(),
      admin_id,
    });
    res.json({ message: "Berhasil tambah pengiriman", data });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal simpan pengiriman", error: err.message });
  }
};

// List semua pengiriman (GET /api/pengiriman)
exports.getAll = async (req, res) => {
  try {
    const list = await Pengiriman.findAll({
      include: [
        {
          model: Penyewaan,
          as: "penyewaan",
          include: [
            { model: User, as: "user" },
            { model: Kendaraan, as: "kendaraan" },
          ],
        },
      ],
      order: [["waktu_input", "DESC"]],
    });
    res.json(list);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal ambil data pengiriman", error: err.message });
  }
};

// Hapus data pengiriman (DELETE /api/pengiriman/:id)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await Pengiriman.destroy({ where: { id } });
    res.json({ message: "Berhasil hapus pengiriman" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal hapus pengiriman", error: err.message });
  }
};

// ====== EXPORT EXCEL DENGAN REKAP ======
exports.exportExcel = async (req, res) => {
  try {
    const list = await Pengiriman.findAll({
      include: [
        {
          model: Penyewaan,
          as: "penyewaan",
          include: [
            { model: User, as: "user" },
            { model: Kendaraan, as: "kendaraan" },
          ],
        },
      ],
      order: [["waktu_input", "DESC"]],
    });

    // Summary: total biaya pengiriman
    const totalPengiriman = list.reduce(
      (sum, item) => sum + (item.biaya || 0),
      0
    );

    // Total pendapatan: sum total_bayar semua SELESAI
    const pesananSelesai = await Penyewaan.findAll({
      where: { status: "SELESAI" },
    });
    const totalPendapatan = pesananSelesai.reduce(
      (sum, p) => sum + (p.total_bayar || p.total || 0),
      0
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Pengiriman");

    worksheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Nama Penyewa", key: "nama_penyewa", width: 22 },
      { header: "Kendaraan", key: "kendaraan", width: 22 },
      { header: "Alamat Tujuan", key: "alamat_tujuan", width: 30 },
      { header: "Jarak (km)", key: "jarak_km", width: 10 },
      { header: "Biaya", key: "biaya", width: 13 },
      { header: "Waktu Input", key: "waktu_input", width: 22 },
    ];

    list.forEach((item, idx) => {
      worksheet.addRow({
        no: idx + 1,
        nama_penyewa: item.penyewaan?.user?.nama || "-",
        kendaraan: item.penyewaan?.kendaraan?.nama || "-",
        alamat_tujuan: item.alamat_tujuan,
        jarak_km: item.jarak_km,
        biaya: item.biaya,
        waktu_input: item.waktu_input
          ? new Date(item.waktu_input).toLocaleString("id-ID")
          : "",
      });
    });

    // Empty row
    worksheet.addRow({});
    worksheet.addRow({
      no: "",
      nama_penyewa: "",
      kendaraan: "",
      alamat_tujuan: "",
      jarak_km: "",
      biaya: "Total Pengiriman",
      waktu_input: totalPengiriman,
    });
    worksheet.addRow({
      no: "",
      nama_penyewa: "",
      kendaraan: "",
      alamat_tujuan: "",
      jarak_km: "",
      biaya: "Total Pendapatan",
      waktu_input: totalPendapatan,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=data_pengiriman.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: "Gagal export Excel", error: err.message });
  }
};

// ====== EXPORT PDF DENGAN REKAP ======
exports.exportPdf = async (req, res) => {
  try {
    const list = await Pengiriman.findAll({
      include: [
        {
          model: Penyewaan,
          as: "penyewaan",
          include: [
            { model: User, as: "user" },
            { model: Kendaraan, as: "kendaraan" },
          ],
        },
      ],
      order: [["waktu_input", "DESC"]],
    });

    // Summary
    const totalPengiriman = list.reduce(
      (sum, item) => sum + (item.biaya || 0),
      0
    );
    const pesananSelesai = await Penyewaan.findAll({
      where: { status: "SELESAI" },
    });
    const totalPendapatan = pesananSelesai.reduce(
      (sum, p) => sum + (p.total_bayar || p.total || 0),
      0
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=data_pengiriman.pdf"
    );
    doc.pipe(res);

    doc.fontSize(16).text("Data Pengiriman MotoRent", { align: "center" });
    doc.moveDown(0.7);

    // Table header
    doc
      .fontSize(11)
      .text(
        "No   Nama Penyewa           Kendaraan         Alamat Tujuan                Jarak(km)   Biaya        Waktu Input",
        { underline: true }
      );
    doc.moveDown(0.2);

    list.forEach((item, idx) => {
      doc
        .fontSize(9.5)
        .text(
          String(idx + 1).padEnd(4) +
            (item.penyewaan?.user?.nama || "-").padEnd(22) +
            (item.penyewaan?.kendaraan?.nama || "-").padEnd(18) +
            (item.alamat_tujuan || "-").padEnd(30) +
            String(item.jarak_km).padEnd(11) +
            String(item.biaya).padEnd(12) +
            (item.waktu_input
              ? new Date(item.waktu_input).toLocaleString("id-ID")
              : ""),
          { continued: false }
        );
    });

    // Summary di bawah
    doc.moveDown(1.5);
    doc
      .fontSize(11)
      .text(
        `Total Uang Pengiriman: Rp ${totalPengiriman.toLocaleString("id-ID")}`
      );
    doc
      .fontSize(11)
      .text(
        `Total Pendapatan (Pesanan Selesai): Rp ${totalPendapatan.toLocaleString(
          "id-ID"
        )}`
      );

    doc.end();
  } catch (err) {
    res.status(500).json({ message: "Gagal export PDF", error: err.message });
  }
};
