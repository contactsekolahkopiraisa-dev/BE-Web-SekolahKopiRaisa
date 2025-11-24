/**
 * Menghitung durasi dalam satuan bulan antara dua tanggal.
 *
 * Perhitungan dilakukan berdasarkan selisih hari,
 * kemudian dikonversi ke bulan menggunakan pembulatan ke atas
 * (setiap 30 hari dianggap 1 bulan).
 *
 * Contoh:
 * - 15 hari → 1 bulan
 * - 35 hari → 2 bulan
 *
 * @param {Date} mulai - Tanggal mulai periode.
 * @param {Date} selesai - Tanggal akhir periode.
 * @returns {number} Jumlah durasi dalam bulan (dibulatkan ke atas).
 */

const calculateDurationMonth = (mulai, selesai) => {
    const diffMs = selesai - mulai;
    const diffHari = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // hitung hari dibulatkan ke atas
    const durasiBulan = Math.ceil(diffHari / 30);
    return durasiBulan;
};

module.exports = {
    calculateDurationMonth
}