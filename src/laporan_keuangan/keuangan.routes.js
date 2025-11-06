// // src/laporan_keuangan/keuangan.routes.js
// const express = require('express');
// const router = express.Router();
// const { authenticate, requireUMKM, requireAdmin } = require('../middleware/auth');
// const { 
//   validateCreateLaporanKeuangan, 
//   validateUpdateLaporanKeuangan 
// } = require('../middleware/validation');
// const { handleValidationErrors } = require('../middleware/errorHandler');

// const {
//   createLaporan,
//   getAllLaporan,
//   getLaporanById,
//   getLaporanByUserId,
//   updateLaporan,
//   deleteLaporan,
//   getSummary
// } = require('./keuangan.controller');

// // Routes
// router.post('/', 
//   authenticate, 
//   requireUMKM, 
//   validateCreateLaporanKeuangan, 
//   handleValidationErrors, 
//   createLaporan
// );

// router.get('/', 
//   authenticate, 
//   getAllLaporan
// );

// router.get('/:id', 
//   authenticate, 
//   getLaporanById
// );

// router.get('/user/:userId', 
//   authenticate, 
//   getLaporanByUserId
// );

// router.put('/:id', 
//   authenticate, 
//   requireUMKM, 
//   validateUpdateLaporanKeuangan, 
//   handleValidationErrors, 
//   updateLaporan
// );

// router.delete('/:id', 
//   authenticate, 
//   requireUMKM, 
//   deleteLaporan
// );

// router.get('/summary/:userId', 
//   authenticate, 
//   getSummary
// );

// module.exports = router;