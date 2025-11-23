const express = require('express');
const laporanLayananRoutes = express.Router();
const { upload } = require('../middleware/multer.js');
const { authMiddleware, roleMiddleware } = require('../middleware/middleware.js');
const { laporanLayananController } = require("./C_LaporanLayanan.js");


// LAPORAN LAYANAN ROUTES
laporanLayananRoutes.post('/', authMiddleware, roleMiddleware('customer'), upload.single('foto_kegiatan'), laporanLayananController.create);
laporanLayananRoutes.get('/:id',authMiddleware, roleMiddleware('admin','customer'), laporanLayananController.getById);

module.exports = {
    laporanLayananRoutes
}