const ApiError = require ("../utils/apiError.js");
const { STATUS } = require("../utils/constant/enum.js");

const { mouService } = require("./C_Mou.service.js");


const mouController = {
    // GET MOU BY ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const data = await mouService.getById(id);
            res.status(200).json({ success: true, message: `Berhasil Mendapatkan MOU ID '${id}'!`, data });
        } catch (err) {
            next(err); // dilempar ke middleware errorHandler
        }
    },
    // POST MOU TO DB
    async create(req, res, next) {
        try {
            // kembalikan kalau bukan customer
            // if (req.user.role !== 'customer') { throw new ApiError(403, 'Akses ditolak! Hanya customer yang dapat mengunggah MOU !'); }
            const data = await mouService.create(req.body, req.file);
            res.status(201).json({ success: true, message: `Berhasil mengunggah MOU !`, data});
        } catch (err) {
            next(err);
        }
    },
    // PUT MOU BY ID
    async update(req, res, next) {
        try {
            // kembalikan kalau bukan customer
            // if (req.user.role !== 'customer') { throw new ApiError(403, 'Akses ditolak! Hanya customer yang dapat mengunggah MOU !'); }
            const data = await mouService.update(req.params, req.file);
            res.status(200).json({ success: true, message: `Berhasil mengubah MOU !`, data});
        } catch (err) {
            next(err);
        }
    },
    // PUT ACCEPT MOU SUBMISSION
    async accept(req, res, next) {
        try {
            const data = await mouService.updateStatus(req.params, req.body, STATUS.DISETUJUI.id);
            res.status(200).json({success: true, message: 'Berhasil menyetujui MOU !', data});
        } catch (err) {
            next(err);
        }
    },
    // PUT REJECT MOU SUBMISSION
    async reject(req, res, next) {
        try {
            const data = await mouService.updateStatus(req.params, req.body, STATUS.DITOLAK.id);
            res.status(200).json({success: true, message: 'Berhasil menolak MOU !', data});
        } catch (err) {
            next(err);
        }
    }
}


module.exports = {
    mouController
}