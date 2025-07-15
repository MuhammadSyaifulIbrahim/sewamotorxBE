const ExcelJS = require("exceljs");

const exportPenyewaanToExcel = async (data, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Laporan Penyewaan");

  worksheet.columns = [
    { header: "ID", key: "id", width: 5 },
    { header: "Pelanggan", key: "pelanggan", width: 25 },
    { header: "Kendaraan", key: "kendaraan", width: 25 },
    { header: "Tanggal Sewa", key: "tanggal_sewa", width: 15 },
    { header: "Tanggal Kembali", key: "tanggal_kembali", width: 15 },
    { header: "Total Biaya", key: "total_biaya", width: 15 },
  ];

  data.forEach((item) => {
    worksheet.addRow({
      id: item.id,
      pelanggan: item.pelanggan?.nama,
      kendaraan: item.kendaraan?.nama,
      tanggal_sewa: item.tanggal_sewa,
      tanggal_kembali: item.tanggal_kembali,
      total_biaya: item.total_biaya,
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=laporan_penyewaan.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { exportPenyewaanToExcel };
