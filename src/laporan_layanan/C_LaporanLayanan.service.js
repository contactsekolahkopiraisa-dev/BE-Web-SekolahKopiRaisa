const { layananService } = require("../layanan/C_Layanan.service");
const { uploadToCloudinary } = require("../services/cloudinaryUpload.service");
const ApiError = require("../utils/apiError");
const { calculateDurationMonth } = require("../utils/calculateDurationMonth");
const { STATUS } = require("../utils/constant/enum");
const { sanitizeData } = require("../utils/sanitizeData");
const { laporanLayananRepository } = require("./C_LaporanLayanan.repository");


const laporanLayananService = {
    async getById(id) {
        const laporanLayanan = await laporanLayananRepository.findById(id);
        if (!laporanLayanan) return new ApiError(404, "Laporan kegiatan tidak ditemukan!");

        const mulai = new Date(laporanLayanan.layanan.tanggal_mulai);
        const selesai = new Date(laporanLayanan.layanan.tanggal_selesai);
        const durasi = await calculateDurationMonth(mulai, selesai);

        return {
            id: laporanLayanan.id,
            nama_p4s: laporanLayanan.nama_p4s,
            asal_kab_kota: laporanLayanan.asal_kab_kota,
            jenis_layanan: laporanLayanan.layanan.jenisLayanan.nama_jenis_layanan,
            id_layanan: laporanLayanan.id_layanan,
            asal_instansi: laporanLayanan.layanan.asal_instansi,
            jumlah_peserta: laporanLayanan.layanan.jumlah_peserta,
            tanggal_pelaksanaan: laporanLayanan.layanan.tanggal_pelaksanaan,
            lama_pelaksanaan: durasi, // TODO : pindah utils di layanan penghitung jadi global lalu impor kesini
            foto_kegiatan: laporanLayanan.foto_kegiatan,
            statusPelaporan: laporanLayanan.statusPelaporan,
        };
    },
    async create(dataRaw, file, user) {
        const data = sanitizeData(dataRaw);
        if (!file) { throw new ApiError(404, "Foto kegiatan tidak disertakan!")};
        // validasi ada tidak layanannya, 404 nya include disana
        const query = { where: { } } // helper nya minta query, yasudah turutin kosongan
        const layanan = await layananService.getById(data.id_layanan, user, query);
        // kalau bukan dirinya sendiri tidak bisa upload
        if (layanan.pemohon.id !== user.id) {
            throw new ApiError(403, "Akses ditolak! hanya user yang bersangkutan yang dapat mengupload!");
        }
        
        // kalau status pelaksanaan belum selesai maka tidak bisa submit
        if (layanan.pelaksanaan.id !== STATUS.SELESAI.id) {
            throw new ApiError(400, "Pelaksanaan layanan belum selesai! tidak bisa mengirim laporan")
        }
        // kalau sudah pernah selesai laporannya maka tidak bisa submit lagi
        if (layanan.laporan.nama_status_kode !== STATUS.BELUM_TERLAKSANA.nama_status_kode) {
            throw new ApiError(409, "Pelaksanaan layanan sudah selesai! tidak bisa mengirim laporan lagi")
        }
        // upload file
        const uploadedFoto = await uploadToCloudinary(
            file.buffer,
            file.originalname,
            {
                folder: "laporan-layanan",
                mimetype: file.mimetype,
            }
        );
        if (!uploadedFoto) { throw new ApiError(500, "Terjadi kesalahan ketika upload file") };
        // masukkan link foto ke payload
        data.foto_kegiatan = uploadedFoto.url;
        // sesuai flow, laporan auto acc
        data.id_status_pelaporan = STATUS.DISETUJUI.id;

        // insert
        const created = await laporanLayananRepository.create(data)
        return created;
    }
}


module.exports = {
    laporanLayananService
}