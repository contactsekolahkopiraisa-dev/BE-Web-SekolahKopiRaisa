const ApiError = require("../utils/apiError.js");
const { modulRepository } = require("./C_Modul.repository.js");
const { uploadToCloudinary } = require("../services/cloudinaryUpload.service.js");
const { deleteFromCloudinaryByUrl } = require("../services/cloudinaryDelete.service.js");
const { sanitizeData } = require("../utils/sanitizeData.js");

const modulService = {
  // GET ALL MODUL
  async getAll() {
    const moduls = await modulRepository.findAll();
    if (!moduls || moduls.length === 0) {
      throw new ApiError(404, "Data modul tidak ditemukan!");
    }
    return moduls;
  },
  // GET MODUL BY ID
  async getById(id) {
    const modul = await modulRepository.findById(id);
    if (!modul) {
      throw new ApiError(404, "Data modul tidak ditemukan!");
    }
    return modul;
  },
  // CREATE NEW MODUL
  async create(data, files, user) {
    // kembalikan kalau tidak ada file modulnya
    const fileModul = files?.['file_modul'] ? files['file_modul'][0] : null;
    const fileSampul = files?.['foto_sampul'] ? files['foto_sampul'][0] : null;
    if (!fileModul) {
      throw new ApiError(400, "File modul tidak disertakan!");
    }

    // upload file_modul ke Cloudinary
    const fileUpload = await uploadToCloudinary(
      fileModul.buffer,
      fileModul.originalname,
      {
        folder: "modul",
        mimetype: fileModul.mimetype,
      }
    );
    const fileModulUrl = fileUpload.url;

    // upload foto_sampul kalau ada ke cloudinary
    let fotoSampulUrl = null;
    if (fileSampul) {
      const fotoUpload = await uploadToCloudinary(
        fileSampul.buffer,
        fileSampul.originalname, {
        folder: "modul/sampul",
        mimetype: fileSampul.mimetype,
      });
      fotoSampulUrl = fotoUpload.url;
    }

    const payload = {
      id_dibuat_oleh: user.id,
      judul_modul: data.judul_modul,
      deskripsi: data.deskripsi,
      file_modul: fileModulUrl,
      foto_sampul: fotoSampulUrl,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const created = await modulRepository.create(payload);
    return created;
  },
  // PUT MODUL BY ID
  async update(id, dataRaw, files) {
    const fileModul = files?.['file_modul'] ? files['file_modul'][0] : null;
    const fileSampul = files?.['foto_sampul'] ? files['foto_sampul'][0] : null;
    // cari data itu ada tidak, reuse kode this.getById()
    const existingModul = await this.getById(id);
    if (!existingModul) { throw new ApiError(404, "Data modul tidak ditemukan!") }
    // hapus id biar id nya g diupdate
    delete dataRaw.id;
    // bersihkan data : konvert integer, pemilihan data
    const data = sanitizeData(dataRaw);
    if (!data.judul_modul) data.judul_modul = existingModul.judul_modul;
    if (!data.deskripsi) data.deskripsi = existingModul.deskripsi;

    // hapus file modul lama kalo mau ubah modul
    if (fileModul) {
      if (existingModul.file_modul) {
        await deleteFromCloudinaryByUrl(existingModul.file_modul, 'modul');
      }
      // upload modul baru
      const uploadedFile = await uploadToCloudinary(
        fileModul.buffer,
        fileModul.originalname,
        {
          folder: "modul",
          mimetype: fileModul.mimetype,
        }
      );
      data.file_modul = uploadedFile.url;
      // kalau tidak pakai link lama
    } else {
      data.file_modul = existingModul.file_modul;
    }
    // hapus foto sampul lama kalo mau ubah sampul
    if (fileSampul) {
      if (existingModul.foto_sampul) {
        await deleteFromCloudinaryByUrl(existingModul.foto_sampul, 'modul/sampul');
      }
      // upload modul baru
      const uploadedFoto = await uploadToCloudinary(
        fileSampul.buffer,
        fileSampul.originalname,
        {
          folder: "modul/sampul",
          mimetype: fileSampul.mimetype,
        }
      );
      data.foto_sampul = uploadedFoto.url;
      // kalau tidak pakai link lama
    } else {
      data.foto_sampul = existingModul.foto_sampul;
    }

    // lempar ke repo
    const updated = await modulRepository.update(id, data);
    return updated;
  },
  // DELETE MODUL BY ID
  async delete(id) {
    // cari data itu ada tidak, reuse kode this.getById()
    const existingModul = await this.getById(id);
    if (!existingModul) { throw new ApiError(404, "Data modul tidak ditemukan!") }
    // hapus sampul dulu kalau ada
    if (existingModul.foto_sampul) {
      const modulSampulDeleted = await deleteFromCloudinaryByUrl(existingModul.foto_sampul, 'modul/sampul');
      // abort kalau foto gagal dihapus
      if (!modulSampulDeleted) {
        throw new ApiError(500, "Gagal hapus foto sampul modul di Cloudinary, data batal dihapus");
      }
    }
    // hapus modul dulu
    const modulFileDeleted = await deleteFromCloudinaryByUrl(existingModul.file_modul, 'modul');
    // abort kalau file gagal dihapus
    if (!modulFileDeleted) {
      throw new ApiError(500, "Gagal hapus file modul di Cloudinary, data batal dihapus");
    }
    // hapus data
    const deleted = await modulRepository.delete(id);
    return deleted;
  },
};

module.exports = {
  modulService,
};
