const { jenisLayananService, targetPesertaService } = require("./C_Layanan.service.js");


const jenisLayananController = {
    // GET ALL JENIS LAYANAN
    async getAll(req, res, next) {
        try {
            const data = await jenisLayananService.getAll();
            res.status(200).json({ success: true, message: "Berhasil mendapatkan semua Jenis Layanan !", data });
        } catch (err) {
            next(err); // dilempar ke middleware errorHandler
        }
    },
    // GET JENIS LAYANAN BY ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const data = await jenisLayananService.getById(id);
            res.status(200).json({ success: true, message: `Berhasil Mendapatkan Jenis Layanan ID '${id}' !`, data });
        } catch (err) {
            next(err); // dilempar ke middleware errorHandler
        }
    },
    // PUT JENIS LAYANAN BY ID
    async update(req, res, next) {
        try {
            const { id } = req.params, { nama_jenis_layanan: namaLama } = await jenisLayananService.getById(id);
            const img = req.file || null;
            const data = await jenisLayananService.update(id, req.body, img)
            res.status(200).json({ success: true, message: `Berhasil mengubah Jenis Layanan '${namaLama || data.nama_jenis_layanan}' !`, data });
        } catch (err) {
            next(err);
        }
    }
    // METHOD YG LAIN TIDAK ADA KARENA TIDAK DIMINTA DI SR
}

const targetPesertaController = {
    // GET ALL TARGET PESERTA
    async getAll(req, res, next) {
        try {
            const data = await targetPesertaService.getAll();
            res.status(200).json({ success: true, message: "Berhasil mendapatkan semua Target Peserta !", data });
        } catch (err) {
            next(err); // dilempar ke middleware errorHandler
        }
    },
    // GET TARGET PESERTA BY ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const data = await targetPesertaService.getById(id);
            res.status(200).json({ success: true, message: `Berhasil Mendapatkan Target Peserta ID '${id}' !`, data });
        } catch (err) {
            next(err); // dilempar ke middleware errorHandler
        }
    },
    // PUT JENIS LAYANAN BY ID
    async update(req, res, next) {
        try {
            console.log(req.image);
            // kembalikan kalau bukan admin
            if (req.user.admin !== true) { throw new ApiError(403, 'Akses ditolak! Hanya admin yang dapat mengubah jenis layanan !'); }

            const data = await jenisLayananService.update(req.user.id, req.body);
            res.status(200).json({ success: true, message: `Berhasil mengubah Jenis Layanan '${data.nama_jenis_layanan}' !`, data});
        } catch (err) {
            next(err);
        }
    }
}

module.exports = {
    jenisLayananController,
    targetPesertaController
}