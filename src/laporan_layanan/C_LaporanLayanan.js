const ApiError = require("../utils/apiError");
const { laporanLayananService } = require("./C_LaporanLayanan.service")


const laporanLayananController = {

    // GET LAYANAN BY ID
    async getById(req, res, next) {
        try {
            const laporan = await laporanLayananService.getById(req.params.id); 
            res.status(200).json({ success: true, message: "Berhasil mendapatkan laporan!", data: laporan });
        } catch (err) {
            next(err);
        }
    },
    // POST SUBMIT LAPORAN LAYANAN BARU
    async create(req, res, next) {
        try {
            // kembalikan kalau bukan cust
            if (req.user.role !== 'customer') { throw new ApiError(403, 'Akses ditolak! Hanya customer yang dapat menyerahkan laporan !'); }
            const laporan = await laporanLayananService.create(req.body, req.file, req.user);
            res.status(201).json({ success: true, message: "Berhasil mengirim laporan!", data: laporan });
        } catch (err) {
            next(err);
        }
    }
}


module.exports = {
    laporanLayananController
}