const ApiError = require("../utils/apiError.js");
const { mouRepository, mouRejectionRepository } = require("./C_Mou.repository.js");
const { uploadToCloudinary } = require("../services/cloudinaryUpload.service.js");
const { deleteFromCloudinaryByUrl } = require("../services/cloudinaryDelete.service.js");
const { sanitizeData } = require("../utils/sanitizeData.js");
const { STATUS } = require("../utils/constant/enum.js");
const prisma = require("../db/index.js");
const { layananRepository } = require("../layanan/C_Layanan.repository.js");


const mouService = {
    // GET MOU BY ID
    async getById(id) {
        const mou = await mouRepository.findById(parseInt(id));
        if (!mou) { throw new ApiError(404, "Data mou tidak ditemukan!"); }
        return mou;
    },
    // CREATE NEW MOU
    async create(dataRaw, file) {
        // kembalikan kalau tidak ada file mounya
        if (!file) { throw new ApiError(400, "File tidak disertakan!"); }
        // formatting
        const data = sanitizeData(dataRaw);
        // upload file ke Cloudinary
        const fileUpload = await uploadToCloudinary(file.buffer, file.originalname, {
            folder: "mou",
            mimetype: file.mimetype,
        }); console.log('File Upload Result:', fileUpload);
        // build payload
        const payload = {
            id_layanan: data.id_layanan,
            id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id,
            file_mou: fileUpload.url
        };
        // lempar ke repo
        const created = await mouRepository.create(payload);
        return created;
    },
    // PUT MOU BY ID
    async update(idRaw, file) {
        const { id } = sanitizeData(idRaw);
        // cari data itu ada tidak, reuse kode this.getById()
        const existingMou = await this.getById(id);
        if (!existingMou) { throw new ApiError(404, "Data mou tidak ditemukan!"); }
        if (!file) { throw new ApiError(400, "File tidak disertakan!"); }

        // hapus file mou lama kalo mau ubah mou
        if (existingMou.file_mou) {
            await deleteFromCloudinaryByUrl(existingMou.file_mou, 'mou');
        }
        // upload modul baru
        const uploadedFile = await uploadToCloudinary(file.buffer, file.originalname, {
            folder: "mou",
            mimetype: file.mimetype,
        }
        );
        const data = {
            file_mou: uploadedFile.url,
            // update status ke menunggu persetujuan
            id_status_pengajuan: STATUS.MENUNGGU_PERSETUJUAN.id
        }
        // hapus mouRejection nya
        const rejection = await MouRejectionService.getById(existingMou.mouRejection.id);
        if (rejection) {
            await MouRejectionService.delete(rejection.id);
        }
        // lempar ke repo
        const updated = await mouRepository.update(id, data);
        return updated;
    },
    // PUT ACCEPT/REJECT MOU
    async updateStatus(idRaw, dataRaw, status) {
        // pakai transaction agar ketika rejection / mou gagal maka semuanya batal
        return prisma.$transaction(async (tx) => {
            const { id } = sanitizeData(idRaw);
            const data = sanitizeData(dataRaw);
            // cari data itu ada tidak, pakai tx
            const existingMou = await mouRepository.findById(id, tx);
            if (!existingMou) { throw new ApiError(404, "Data mou tidak ditemukan!"); }
            // create payload
            const payload = {
                file_mou: existingMou.file_mou,
                id_status_pengajuan: status,
                tanggal_disetujui: status == STATUS.DISETUJUI.id ? new Date() : null
            };
            let alasanCreated = null;
            if (status == STATUS.DITOLAK.id) {
                // kalau ditolak maka upload alasan
                alasanCreated = await MouRejectionService.create(id, data.alasan, tx)
            }
            let layananUpdated;
            if (status == STATUS.DISETUJUI.id) {
                // trigger ubah status di tabel layanan jadi sedang berjalan
                // DEV NOTES : memang agak g nyambung tp mmg blm bs pakai cron job
                const layananPayload = {
                    id_status_pelaksanaan: STATUS.SEDANG_BERJALAN.id
                }
                layananUpdated = await layananRepository.update(id, layananPayload, tx);
            }
            const updated = await mouRepository.update(id, payload, tx);

            if (alasanCreated) { updated.mouRejection = alasanCreated; }
            if (layananUpdated) { updated.layanan = layananUpdated; }
            return updated;
        }, {
            timeout: 10000
        })
    }
};

const MouRejectionService = {
    // GET MOU REJECTION BY ID
    async getById(id) {
        const mou = await mouRejectionRepository.findById(parseInt(id));
        if (!mou) { throw new ApiError(404, "Data mou tidak ditemukan!"); }
        return mou;
    },
    // CREATE NEW MOU REJECTION
    async create(idMou, alasan, tx) {
        const mou = await mouRepository.findById(parseInt(idMou));
        if (!mou) { throw new ApiError(404, "Data mou tidak ditemukan!"); }
        const payload = {
            id_mou: idMou,
            alasan: alasan
        };
        const created = await mouRejectionRepository.create(payload, tx);
        return created;
    },
    // DELETE MOU REJECTION BY ID
    async delete(id) {
        const existingMou = await MouRejectionService.getById(id);
        if (!existingMou) { throw new ApiError(404, "Data mou tidak ditemukan!"); }
        const deleted = await mouRejectionRepository.delete(id);
        return deleted;
    },
}


module.exports = {
    mouService,
};
