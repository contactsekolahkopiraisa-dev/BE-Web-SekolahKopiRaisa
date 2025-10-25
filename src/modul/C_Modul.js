const ApiError = require ("../utils/ApiError.js");

const { modulService } = require("./C_Modul.service.js");


const modulController = {
    // GET ALL MODUL
    async getAll(req, res, next) {
        try {
            const data = await modulService.getAll();
            res.status(200).json({ success: true, message: "Berhasil mendapatkan semua Modul!", data });
        } catch (err) {
            next(err); // dilempar ke middleware errorHandler
        }
    },
    // GET MODUL BY ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const data = await modulService.getById(id);
            res.status(200).json({ success: true, message: `Berhasil Mendapatkan Modul ID '${id}'!`, data });
        } catch (err) {
            next(err); // dilempar ke middleware errorHandler
        }
    },
    // POST MODUL TO DB
    async create(req, res, next) {
        try {
            console.log(req.file);
            // kembalikan kalau bukan admin
            if (req.user.admin !== true) { throw new ApiError(403, 'Akses ditolak! Hanya admin yang dapat mengunggah modul !'); }
            // kembalikan kalau tidak ada file modulnya
            if (!req.file) { throw new ApiError(400, 'File tidak disertakan!'); }
            const data = await modulService.create(req.body, req.file, req.user);
            res.status(201).json({ success: true, message: `Berhasil mengunggah Modul '${data.judul_modul}' !`, data});
        } catch (err) {
            next(err);
        }
    }
}

module.exports = {
    modulController
}