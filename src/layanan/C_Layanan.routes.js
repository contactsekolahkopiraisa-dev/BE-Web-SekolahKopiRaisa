const express = require('express');
const jenisLayananRoutes = express.Router();
const layananRoutes = express.Router();
const targetPesertaRoutes = express.Router();
const { upload } = require('../middleware/multer');
const { uploadFile } = require('../middleware/multer.js');
const { authMiddleware, permissionMiddleware } = require('../middleware/middleware');
const { jenisLayananController, targetPesertaController, layananController } = require('./C_Layanan.js');


// JENIS LAYANAN ROUTES
jenisLayananRoutes.get('/', jenisLayananController.getAll);
jenisLayananRoutes.get('/:id', jenisLayananController.getById);
jenisLayananRoutes.put('/:id', authMiddleware, permissionMiddleware('admin'), upload.single('image'), jenisLayananController.update);
// TARGET PESERTA ROUTES
targetPesertaRoutes.get('/', targetPesertaController.getAll);
targetPesertaRoutes.get('/:id', targetPesertaController.getById);
// LAYANAN ROUTES
layananRoutes.get('/', (req, res) => {
  res.send('Layanan OK');
});
layananRoutes.post('/', authMiddleware, permissionMiddleware('customer'),
  uploadFile.fields([
    { name: 'file_proposal', maxCount: 1 },
    { name: 'file_surat_permohonan', maxCount: 1 },
    { name: 'file_surat_pengantar', maxCount: 1 },
    { name: 'file_surat_undangan', maxCount: 1 }
  ]),
  layananController.create);


  
module.exports = {
  layananRoutes,
  jenisLayananRoutes,
  targetPesertaRoutes,
};