module.exports = function calculateDynamicPrice({
  harga_per_hari,
  diskon_produk = 0, // Tambahkan default 0 agar aman
  jam_pengambilan,
  jam_pengembalian,
}) {
  if (!jam_pengambilan || !jam_pengembalian) {
    throw new Error("jam_pengambilan dan jam_pengembalian wajib diisi");
  }

  const durasiHari = Math.max(
    1,
    Math.ceil((jam_pengembalian - jam_pengambilan) / (1000 * 60 * 60 * 24))
  );

  // === Hitung harga awal per hari setelah diskon produk ===
  const hargaSetelahDiskonProduk = Math.round(
    harga_per_hari * (1 - (diskon_produk || 0) / 100)
  );

  const basePrice = hargaSetelahDiskonProduk * durasiHari;
  let total = basePrice;
  const breakdown = [];

  // Catat diskon produk jika ada
  if (diskon_produk > 0) {
    const potongan = harga_per_hari - hargaSetelahDiskonProduk;
    breakdown.push({
      jenis: "Diskon",
      keterangan: `Diskon Produk ${diskon_produk}%`,
      nominal: -potongan * durasiHari,
    });
  }

  // === Weekend markup ===
  const pickupDay = jam_pengambilan.getDay();
  if (pickupDay === 0 || pickupDay === 6) {
    total += 25000;
    breakdown.push({
      jenis: "Markup",
      keterangan: "Biaya tambahan Weekend",
      nominal: 25000,
    });
  }

  // === Diskon long rent ===
  if (durasiHari >= 30) {
    const potongan = total * 0.15;
    total -= potongan;
    breakdown.push({
      jenis: "Diskon",
      keterangan: "Diskon Long Rent 15% (≥ 30 hari)",
      nominal: -Math.round(potongan),
    });
  } else if (durasiHari >= 7) {
    const potongan = total * 0.1;
    total -= potongan;
    breakdown.push({
      jenis: "Diskon",
      keterangan: "Diskon Long Rent 10% (≥ 7 hari)",
      nominal: -Math.round(potongan),
    });
  }

  return {
    harga_per_hari,
    durasi_hari: durasiHari,
    harga_awal: harga_per_hari * durasiHari,
    total: Math.round(total),
    breakdown,
  };
};
