const { jenisLayananService, targetPesertaService, layananService, statusKodeService } = require("./C_Layanan.service.js");
const ApiError = require ("../utils/apiError.js");
const { STATUS, STATEMENT_LAYANAN } = require("../utils/constant/enum.js");


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
            const data = await statusKodeService.getById(req.params);
            res.status(200).json({ success: true, message: `Berhasil Mendapatkan status kode !`, data });
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
            const data = await jenisLayananService.getById(req.params);
            res.status(200).json({ success: true, message: `Berhasil Mendapatkan Jenis Layanan !`, data });
        } catch (err) {
            next(err); // dilempar ke middleware errorHandler
        }
    },
    // PUT JENIS LAYANAN BY ID
    async update(req, res, next) {
        try {
            const img = req.file || null;
            const data = await jenisLayananService.update(req.params.id, req.body, img)
            res.status(200).json({ success: true, message: `Berhasil mengubah Jenis Layanan !`, data });
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
            const data = await targetPesertaService.getById(req.params.id);
            res.status(200).json({ success: true, message: `Berhasil Mendapatkan Target Peserta !`, data });
        } catch (err) {
            next(err); // dilempar ke middleware errorHandler
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
            // if (req.user.role !== 'customer') { throw new ApiError(403, 'Akses ditolak! Hanya customer yang dapat mengajukan layanan !'); }
            const layanan = await layananService.create(req.body, req.files, req.user);
            res.status(201).json({ success: true, message: "Berhasil mengajukan layanan!", data: layanan });
        } catch (err) {
            next(err);
        }
    },
    // PUT ACCEPT PENGAJUAN LAYANAN
    async acceptPengajuan(req, res, next) {
        try {
            const layanan = await layananService.updateStatus(STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DISETUJUI, req.params.id,req.user, STATUS.DISETUJUI.id);
            res.status(200).json({ success: true, message: "Berhasil menyetujui layanan!", data: layanan });
        } catch (err) {
            next(err);
        }
    },
    // PUT REJECT PENGAJUAN LAYANAN
    async rejectPengajuan(req, res, next) {
        try {
            const layanan = await layananService.updateStatus(STATEMENT_LAYANAN.PENGAJUAN_LAYANAN_DITOLAK, req.params.id, req.user, STATUS.DITOLAK.id, req.body.alasan);
            res.status(200).json({ success: true, message: "Berhasil menolak layanan!", data: layanan });
        } catch (err) {
            next(err);
        }
    },
    // PUT UPLOAD LOGBOOK LAYANAN
    async uploadLogbook(req, res, next) {
        try {
            const layanan = await layananService.uploadLogbook(req.params.id, req.body.link_logbook, req.user);
            res.status(200).json({ success: true, message: "Berhasil mengunggah logbook!", data: layanan });
        } catch (err) {
            next(err);
        }
    },
    // PUT MARK AS READ LAYANAN
    async setAsOpened(req, res, next) {
        try {
            const layanan = await layananService.setAsOpened(req.params.id, req.user);
            res.status(200).json({ success: true, message: "Berhasil mengubah opened_at layanan!", data: layanan });
        } catch (err) {
            next(err);
        }
    },
    // PUT SELESAIKAN PELAKSANAAN LAYANAN
    async finishPelaksanaan(req, res, next) {
        try {
            const layanan = await layananService.updateStatus(STATEMENT_LAYANAN.PELAKSANAAN_SELESAI, req.params.id, req.user, STATUS.SELESAI.id);
            res.status(200).json({ success: true, message: "Berhasil menyelesaikan layanan !", data: layanan });
        } catch (err) {
            next(err);
        }
    },
}


module.exports = {
    jenisLayananController,
    targetPesertaController,
    layananController,
    statusKodeController
}