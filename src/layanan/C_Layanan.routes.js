const express = require('express');
const jenisLayananRoutes = express.Router();
const layananRoutes = express.Router();
const targetPesertaRoutes = express.Router();
const statusKodeRoutes = express.Router();
const { upload } = require('../middleware/multer');
const { uploadFile } = require('../middleware/multer.js');
const { authMiddleware, roleMiddleware } = require('../middleware/middleware');
const { jenisLayananController, targetPesertaController, layananController, statusKodeController } = require('./C_Layanan.js');
const { validate } = require('../middleware/validate.joi.js');
const { layananGlobalSchema, rejectSchema, uploadLogbookSchema } = require('./C_Layanan.validate.js');


// JENIS LAYANAN ROUTES
jenisLayananRoutes.get('/', jenisLayananController.getAll);
jenisLayananRoutes.get('/:id', jenisLayananController.getById);
jenisLayananRoutes.put('/:id', authMiddleware, roleMiddleware('admin'), upload.single('image'), jenisLayananController.update);
// LAYANAN ROUTES
layananRoutes.get('/', authMiddleware, roleMiddleware('customer', 'admin'), layananController.getAll);
layananRoutes.get('/:id', authMiddleware, roleMiddleware('customer', 'admin'), layananController.getById);
layananRoutes.post('/', authMiddleware, roleMiddleware('customer'), validate(layananGlobalSchema),
  uploadFile.fields([
    { name: 'file_proposal', maxCount: 1 },
    { name: 'file_surat_permohonan', maxCount: 1 },
    { name: 'file_surat_pengantar', maxCount: 1 },
    { name: 'file_surat_undangan', maxCount: 1 }
  ]),
  layananController.create);
layananRoutes.put('/:id/accept-pengajuan', authMiddleware, roleMiddleware('admin'), layananController.acceptPengajuan);
layananRoutes.put('/:id/reject-pengajuan', authMiddleware, roleMiddleware('admin'), validate(rejectSchema), layananController.rejectPengajuan);
layananRoutes.put('/:id/logbook', authMiddleware, roleMiddleware('customer'), validate(uploadLogbookSchema), layananController.uploadLogbook);
layananRoutes.put('/:id/finish-pelaksanaan', authMiddleware, roleMiddleware('customer'), layananController.finishPelaksanaan);
// STATUS ROUTES
statusKodeRoutes.get('/', statusKodeController.getAll);
statusKodeRoutes.get('/:id', statusKodeController.getById);
// TARGET PESERTA ROUTES
targetPesertaRoutes.get('/', targetPesertaController.getAll);
targetPesertaRoutes.get('/:id', targetPesertaController.getById);


module.exports = {
  layananRoutes,
  jenisLayananRoutes,
  targetPesertaRoutes,
};