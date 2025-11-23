const { jenisLayananService, targetPesertaService, layananService, statusKodeService } = require("./C_Layanan.service.js");
const ApiError = require ("../utils/apiError.js");


const statusKodeController = {
    // GET ALL STATUS KODE
    async getAll(req, res, next) {
        try {
            const data = await statusKodeService.getAll();
            res.status(200).json({ success: true, message: "Berhasil mendapatkan semua status kode !", data });
        } catch (err) {
            next(err);
        }
    },
    // GET STATUS KODE BY ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const data = await statusKodeService.getById(id);
            res.status(200).json({ success: true, message: `Berhasil Mendapatkan status kode ID '${id}' !`, data });
        } catch (err) {
            next(err);
        }
    }
}

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
            res.status(200).json({ success: true, message: `Berhasil mengubah Jenis Layanan '${data.nama_jenis_layanan}' !`, data });
        } catch (err) {
            next(err);
        }
    }
}

const layananController = {
    // GET ALL LAYANAN
    async getAll(req, res, next) {
        try {
            const layanans = await layananService.getAll(req.user, req.query);
            res.status(200).json({ success: true, message: "Berhasil mendapatkan semua layanan yang pernah diajukan!", data: layanans });
        } catch (err) {
            next(err);
        }
    },
    // GET LAYANAN BY ID
    async getById(req, res, next) {
        try {
            const layanan = await layananService.getById(req.params.id, req.user, req.query); 
            res.status(200).json({ success: true, message: "Berhasil mendapatkan layanan!", data: layanan });
        } catch (err) {
            next(err);
        }
    },
    // POST AJUKAN LAYANAN BARU
    async create(req, res, next) {
        try {
            // kembalikan kalau bukan cust
            if (req.user.role !== 'customer') { throw new ApiError(403, 'Akses ditolak! Hanya customer yang dapat mengajukan layanan !'); }
            const layanan = await layananService.create(req.body, req.files, req.user);
            res.status(201).json({ success: true, message: "Berhasil mengajukan layanan!", data: layanan });
        } catch (err) {
            next(err);
        }
    },
    // PUT UBAH STATUS LAYANAN
    async updateStatus(req, res, next) {
        try {
            const layanan = await layananService.updateStatus(req.params.id, req.body, req.user);
            res.status(200).json({ success: true, message: "Berhasil memperbarui status layanan!", data: layanan });
        } catch (err) {
            next(err);
        }
    }
    // // PUT UBAH STATUS PENGAJUAN LAYANAN
    // async updateStatusPengajuan(req, res, next) {
    //     try {
    //         // kembalikan kalau bukan admin
    //         if (req.user.role !== 'admin') { throw new ApiError(403, 'Akses ditolak! Hanya admin yang dapat mengubah layanan !'); }
    //         const layanan = await layananService.updateStatusPengajuan(req.params.id, req.body.id_status_pengajuan, req.body.alasan);
    //         res.status(200).json({ success: true, message: "Berhasil memperbarui status layanan!", data: layanan });
    //     } catch (err) {
    //         next(err);
    //     }
    // }
}

// bawah ini cm debug
// const konfigurasiLayananController = {
//     async get(req, res, next) {
//         try {
//             const konfigurasiLayanan = await konfigurasiLayananService.getByHash(req.body.hash_konfigurasi, req.body.id_jenis_layanan);
//             res.status(200).json({ success: true, message: "berhasil mendapatkan konfigurasi layanan!", data: konfigurasiLayanan});
//         } catch (err) {
//             next(err);
//         }
//     }
// }

module.exports = {
    jenisLayananController,
    targetPesertaController,
    layananController,
    statusKodeController
}