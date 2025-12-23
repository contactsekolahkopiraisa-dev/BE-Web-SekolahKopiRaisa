const STATUS = Object.freeze({
    MENUNGGU_PERSETUJUAN: { id: 1, nama_status_kode: "Menunggu Persetujuan" },
    BELUM_TERSEDIA:       { id: 2, nama_status_kode: "Belum Tersedia" },
    BELUM_TERLAKSANA:     { id: 3, nama_status_kode: "Belum Terlaksana" },
    SEDANG_BERJALAN:      { id: 4, nama_status_kode: "Sedang Berjalan" },
    DISETUJUI:            { id: 5, nama_status_kode: "Disetujui" },
    DITOLAK:              { id: 6, nama_status_kode: "Ditolak" },
    SELESAI:              { id: 7, nama_status_kode: "Selesai" },
});
const STATEMENT_LAYANAN = Object.freeze({
    LAYANAN_DIAJUKAN:               { id: 1, nama_status_kode: "LAYANAN DIAJUKAN" },
    PENGAJUAN_LAYANAN_DISETUJUI:    { id: 2, nama_status_kode: "PENGAJUAN LAYANAN DISETUJUI" },
    PENGAJUAN_LAYANAN_DITOLAK:      { id: 2, nama_status_kode: "PENGAJUAN LAYANAN DITOLAK" },
    MOU_DIAJUKAN:                   { id: 2, nama_status_kode: "MOU DIAJUKAN" },
    PENGAJUAN_MOU_DITOLAK:          { id: 2, nama_status_kode: "PENGAJUAN MOU DITOLAK" },
    REVISI_MOU_DIAJUKAN:            { id: 2, nama_status_kode: "REVISI MOU DIAJUKAN" },
    PENGAJUAN_MOU_DISETUJUI:        { id: 2, nama_status_kode: "PENGAJUAN MOU DISETUJUI" },
    PELAKSANAAN_SELESAI:            { id: 3, nama_status_kode: "PELAKSANAAN SELESAI" },
    LAPORAN_DISERAHKAN:             { id: 8, nama_status_kode: "LAPORAN DISERAHKAN"},
    SERTIFIKAT_DIKIRIM:             { id: 9, nama_status_kode: "SERTIFIKAT DIKIRIM"}
});


module.exports = { 
    STATUS, STATEMENT_LAYANAN
};