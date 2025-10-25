const ApiError = require("../utils/apiError.js");
const { modulRepository } = require("./C_Modul.repository.js");
const { uploadToCloudinary } = require('../services/cloudinaryUpload.service.js');

const modulService = {
    // GET ALL MODUL
    async getAll() {
        const moduls = await modulRepository.findAll();
        if (!moduls || moduls.length === 0) {
            throw new ApiError(404, 'Data modul tidak ditemukan!');
        }
        return moduls;
    },
    // GET MODUL BY ID
    async getById(id) {
        const modul = await modulRepository.findById(id);
        if (!modul) {
            throw new ApiError(404, 'Data modul tidak ditemukan!');
        }
        return modul;
    },
    // CREATE NEW MODUL
    async create(data, file, user) {
        // kembalikan kalau tidak ada file modulnya
        if (!file) { throw new ApiError(400, 'File tidak disertakan!'); }

        // upload file ke Cloudinary
        const fileUrl = await uploadToCloudinary(file.buffer, file.originalname, { folder: 'modul' });
        
        const payload = {
            id_dibuat_oleh: user.id,
            judul_modul: data.judul_modul,
            deskripsi: data.deskripsi,
            file_modul: fileUrl,
            created_at: new Date(),
            updated_at: new Date(),
        };

        const created = await modulRepository.create(payload);
        return created;
    }
}


module.exports = {
    modulService
};