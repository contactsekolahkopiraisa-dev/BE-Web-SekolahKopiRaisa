// src/laporan_keuangan/keuangan.controller.js

const {
  createLaporanKeuangan,
  getLaporanKeuangan,
  getLaporanKeuanganById,
  getLaporanKeuanganByUserId,
  updateLaporanKeuangan,
  deleteLaporanKeuangan,
  getSummaryKeuangan
} = require('./keuangan.service');

const express = require('express');
const { authMiddleware } = require('../middleware/middleware'); // [`authMiddleware`](src/middleware/middleware.js)
const handleValidationResult = require('../middleware/handleValidationResult');
const handleValidationResultFinal = require('../middleware/handleValidationResultFinal');
const { validateCreateLaporanKeuangan, validateUpdateLaporanKeuangan } = require('../validation/validation'); // [`validateCreateLaporanKeuangan`](src/validation/validation.js), [`validateUpdateLaporanKeuangan`](src/validation/validation.js)

const createLaporan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.admin;
    
    const laporan = await createLaporanKeuangan(req.body, userId, isAdmin);
    
    res.status(201).json({
      status: 'success',
      message: 'Laporan keuangan berhasil dibuat',
      data: laporan
    });
  } catch (error) {
    next(error);
  }
};

const getAllLaporan = async (req, res, next) => {
  try {
    const filters = req.query;
    const user = req.user;
    
    const result = await getLaporanKeuangan(filters, user);
    
    res.status(200).json({
      status: 'success',
      data: result.data,
      summary: result.summary
    });
  } catch (error) {
    next(error);
  }
};

const getLaporanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const laporan = await getLaporanKeuanganById(id, user);
    
    res.status(200).json({
      status: 'success',
      data: laporan
    });
  } catch (error) {
    next(error);
  }
};

const getLaporanByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requestUser = req.user;
    
    const laporan = await getLaporanKeuanganByUserId(userId, requestUser);
    
    res.status(200).json({
      status: 'success',
      data: laporan
    });
  } catch (error) {
    next(error);
  }
};

const updateLaporan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const updated = await updateLaporanKeuangan(id, req.body, user);
    
    res.status(200).json({
      status: 'success',
      message: 'Laporan keuangan berhasil diupdate',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

const deleteLaporan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const result = await deleteLaporanKeuangan(id, user);
    
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const filters = req.query;
    const requestUser = req.user;
    
    const summary = await getSummaryKeuangan(userId, filters, requestUser);
    
    res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

const router = express.Router();

// Create laporan (authenticated)
router.post('/',
  authMiddleware,
  validateCreateLaporanKeuangan,
  handleValidationResult,
  createLaporan
);

// Get all laporan (authenticated)
router.get('/',
  authMiddleware,
  getAllLaporan
);

// Summary (authenticated)
router.get('/summary/:userId',
  authMiddleware,
  getSummary
);

// Get laporan by user (authenticated)
router.get('/user/:userId',
  authMiddleware,
  getLaporanByUserId
);

// Get laporan by id (authenticated)
router.get('/:id',
  authMiddleware,
  getLaporanById
);

// Update laporan (authenticated)
router.put('/:id',
  authMiddleware,
  validateUpdateLaporanKeuangan,
  handleValidationResult,
  updateLaporan
);

// Delete laporan (authenticated)
router.delete('/:id',
  authMiddleware,
  deleteLaporan
);

// Export router so app.use('/api/v1/laporan-keuangan', require(...)) works
module.exports = router;