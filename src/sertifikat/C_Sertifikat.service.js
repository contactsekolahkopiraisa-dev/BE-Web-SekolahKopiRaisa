const { layananService } = require("../layanan/C_Layanan.service");
const { uploadToCloudinary } = require("../services/cloudinaryUpload.service");
const ApiError = require("../utils/apiError");
const { STATUS } = require("../utils/constant/enum");
const { sanitizeData } = require("../utils/sanitizeData");
const { sertifikatRepository } = require("./C_Sertifikat.repository");

const sertifikatService = {
  async getById(id, user) {
    const sertifikat = await sertifikatRepository.getById(id);
    if (!sertifikat) {
      throw new ApiError(404, "Sertifikat tidak ditemukan !");
    }
    // admin bisa akses bebas
    if (user.role != "admin") {
      // selain admin, hanya yang bersangkutan yang bisa mengakses sertifikat
      if (sertifikat.layanan.id_user != user.id) {
        throw new ApiError(
          403,
          "Hanya user yang bersangkutan yang dapat mengakses sertifikat !"
        );
      }
    }
    return sertifikat;
  },
  async create(data, file, user) {
    // cari layanannya ada atau tidak, 404 nya include disana
    const existingLayanan = await layananService.getById(data.id_layanan, user);
    data = sanitizeData(data);

    // ✅ FIX: Hanya cek apakah laporan sudah ada (sudah diisi), bukan cek status
    if (
      !existingLayanan.laporan ||
      existingLayanan.laporan.nama_status_kode ===
        STATUS.BELUM_TERSEDIA.nama_status_kode
    ) {
      throw new ApiError(
        409,
        "Hanya bisa upload sertifikat setelah laporan diisi !"
      );
    }

    if (file) {
      // upload modul baru
      const uploadedFile = await uploadToCloudinary(
        file.buffer,
        file.originalname,
        {
          folder: "sertifikat",
          mimetype: file.mimetype,
        }
      );
      data.file_sertifikat = uploadedFile.url;
    }

    const created = await sertifikatRepository.create(data);
    return created;
  },
};

module.exports = {
  sertifikatService,
};
