const ApiError = require("../utils/apiError.js");
const { deleteFromCloudinaryByUrl } = require("../services/cloudinaryDelete.service.js");
const { uploadToCloudinary } = require("../services/cloudinaryUpload.service.js");
const { jenisLayananRepository, targetPesertaRepository } = require("./C_Layanan.repository.js");
const { sanitizeData } = require("../utils/sanitizeData.js");

const jenisLayananService = {
    // GET ALL JENIS LAYANAN
    async getAll() {
        const jenisLayanans = await jenisLayananRepository.findAll();
        if (!jenisLayanans || jenisLayanans.length === 0) {
            throw new ApiError(404, 'Data jenis layanan tidak ditemukan!');
        }
        return jenisLayanans;
    },
    // GET JENIS LAYANAN BY ID
    async getById(id) {
        const jenisLayanan = await jenisLayananRepository.findById(id);
        if (!jenisLayanan) {
            throw new ApiError(404, 'Data jenis layanan tidak ditemukan!');
        }
        return jenisLayanan;
    },
    // PUT JENIS LAYANAN BY ID
    async update(id, dataRaw, file) {
        // cari data itu ada tidak, reuse kode this.getById()
        const existingJenisLayanan = await this.getById(id);
        const existingTargetPeserta = await targetPesertaService.getById(dataRaw.id_target_peserta);
        // kalo g ada kembalikan 404
        if (!existingJenisLayanan || !existingTargetPeserta) throw new ApiError(404, 'Data jenis layanan / target peserta tidak ditemukan!');
        // hapus id biar id nya g diupdate
        delete dataRaw.id; 
        // bersihkan data : konvert integer
        const data = sanitizeData(dataRaw);
        // hapus file img kalo ada
        if (file) {
            if (existingJenisLayanan.image) { await deleteFromCloudinaryByUrl(existingJenisLayanan.image, 'jenis-layanan') }
            // upload img baru
            const uploaded = await uploadToCloudinary(file.buffer, file.originalname, {
                folder: 'jenis-layanan',
                type: 'image'
            });
            data.image = uploaded.url;
        }
        // lempar ke repo
        const updated = await jenisLayananRepository.update(id, data);
        return updated;
    }
}

const targetPesertaService = {
    // GET ALL TARGET PESERTA
    async getAll() {
        const targetPesertas = await targetPesertaRepository.findAll();
        if (!targetPesertas || targetPesertas.length === 0) {
            throw new ApiError(404, 'Data target peserta tidak ditemukan!');
        }
        return targetPesertas;
    },
    // GET TARGET PESERTA BY ID
    async getById(id) {
        const targetPeserta = await targetPesertaRepository.findById(id);
        if (!targetPeserta) {
            throw new ApiError(404, 'Data target peserta tidak ditemukan!');
        }
        return targetPeserta;
    },
}

module.exports = {
    jenisLayananService,
    targetPesertaService
};