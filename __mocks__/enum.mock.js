const STATUS = Object.freeze({
    MENUNGGU_PERSETUJUAN: { id: 1, nama_status_kode: "Menunggu Persetujuan" },
    BELUM_TERSEDIA:       { id: 2, nama_status_kode: "Belum Tersedia" },
    BELUM_TERLAKSANA:     { id: 3, nama_status_kode: "Belum Terlaksana" },
    SEDANG_BERJALAN:      { id: 4, nama_status_kode: "Sedang Berjalan" },
    DISETUJUI:            { id: 5, nama_status_kode: "Disetujui" },
    DITOLAK:              { id: 6, nama_status_kode: "Ditolak" },
    SELESAI:              { id: 7, nama_status_kode: "Selesai" },
});
module.exports = { STATUS };