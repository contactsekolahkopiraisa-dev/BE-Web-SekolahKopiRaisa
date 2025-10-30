const express = require('express');
const jenisLayananRoutes = express.Router();
const layananRoutes = express.Router();
const targetPesertaRoutes = express.Router();
const { upload } = require('../middleware/multer');
const { authMiddleware } = require('../middleware/middleware');
const { jenisLayananController, targetPesertaController } = require('./C_Layanan.js');

// JENIS LAYANAN ROUTES
jenisLayananRoutes.get('/', jenisLayananController.getAll);
jenisLayananRoutes.get('/:id', jenisLayananController.getById);
jenisLayananRoutes.put('/:id', authMiddleware, upload.single('image'), jenisLayananController.update);
// TARGET PESERTA ROUTES
targetPesertaRoutes.get('/', targetPesertaController.getAll);
targetPesertaRoutes.get('/:id', targetPesertaController.getById);

// LAYANAN ROUTES
layananRoutes.get('/', (req, res) => {
  res.send('Layanan OK');
});

module.exports = {
  layananRoutes,
  jenisLayananRoutes,
  targetPesertaRoutes
};
