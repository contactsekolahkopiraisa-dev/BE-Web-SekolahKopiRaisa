const express = require('express');
const { authMiddleware } = require('../middleware/middleware');
const ApiError = require('../utils/apiError');
const {
  getLaporanPenjualanUMKM,
  getLaporanPenjualanAdmin,
  getLaporanPenjualanByPartnerId,
  getTopProductsUMKM,
  getTopProductsAllUMKM,
} = require('./penjualan.service');

const router = express.Router();

/**
 * Get laporan penjualan untuk UMKM (akses sendiri)
 * GET /api/penjualan/my-report?bulan=9&tahun=2025
 */
router.get('/my-report', authMiddleware, async (req, res) => {
  try {
    // Validasi hanya UMKM yang bisa akses
    if (req.user.admin) {
      return res.status(403).json({
        message: 'Akses ditolak! Endpoint ini hanya untuk UMKM.',
      });
    }

    const userId = req.user.id;
    const { bulan, tahun } = req.query;

    const laporan = await getLaporanPenjualanUMKM(userId, { bulan, tahun });

    res.status(200).json({
      message: 'Laporan penjualan berhasil didapatkan!',
      data: laporan,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('ApiError:', error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error('Error getting sales report:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan di server!',
      error: error.message,
    });
  }
});

/**
 * Get laporan penjualan semua UMKM (admin only)
 * GET /api/penjualan/admin/report?bulan=9&tahun=2025
 */
router.get('/admin/report', authMiddleware, async (req, res) => {
  try {
    if (!req.user.admin) {
      return res.status(403).json({
        message: 'Akses ditolak! Hanya admin yang bisa mengakses.',
      });
    }

    const { bulan, tahun } = req.query;

    const laporan = await getLaporanPenjualanAdmin({ bulan, tahun });

    res.status(200).json({
      message: 'Laporan penjualan semua UMKM berhasil didapatkan!',
      data: laporan,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('ApiError:', error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error('Error getting admin sales report:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan di server!',
      error: error.message,
    });
  }
});

/**
 * Get laporan penjualan UMKM berdasarkan partner_id (admin only)
 * GET /api/penjualan/admin/partner/:partnerId?bulan=9&tahun=2025
 */
router.get('/admin/partner/:partnerId', authMiddleware, async (req, res) => {
  try {
    if (!req.user.admin) {
      return res.status(403).json({
        message: 'Akses ditolak! Hanya admin yang bisa mengakses.',
      });
    }

    const { partnerId } = req.params;
    const { bulan, tahun } = req.query;

    const laporan = await getLaporanPenjualanByPartnerId(partnerId, { bulan, tahun });

    res.status(200).json({
      message: 'Laporan penjualan UMKM berhasil didapatkan!',
      data: laporan,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('ApiError:', error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error('Error getting UMKM sales report:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan di server!',
      error: error.message,
    });
  }
});

router.get('/my-top-products', authMiddleware, async (req, res) => {
  try {
    if (req.user.admin) {
      return res.status(403).json({
        message: 'Akses ditolak! Endpoint ini hanya untuk UMKM.',
      });
    }

    const userId = req.user.id;
    const { bulan, tahun, limit } = req.query;

    const topProducts = await getTopProductsUMKM(userId, { 
      bulan, 
      tahun, 
      limit: limit ? parseInt(limit) : 10 
    });

    res.status(200).json({
      message: 'Top products berhasil didapatkan!',
      data: topProducts,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('ApiError:', error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error('Error getting top products:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan di server!',
      error: error.message,
    });
  }
});

/**
 * Get top products semua UMKM (Admin only)
 * GET /api/v1/penjualan/admin/top-products?bulan=9&tahun=2025&limit=10
 */
router.get('/admin/top-products', authMiddleware, async (req, res) => {
  try {
    if (!req.user.admin) {
      return res.status(403).json({
        message: 'Akses ditolak! Hanya admin yang bisa mengakses.',
      });
    }

    const { bulan, tahun, limit } = req.query;

    const topProducts = await getTopProductsAllUMKM({ 
      bulan, 
      tahun, 
      limit: limit ? parseInt(limit) : 10 
    });

    res.status(200).json({
      message: 'Top products semua UMKM berhasil didapatkan!',
      data: topProducts,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('ApiError:', error);
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    console.error('Error getting all top products:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan di server!',
      error: error.message,
    });
  }
});

module.exports = router;