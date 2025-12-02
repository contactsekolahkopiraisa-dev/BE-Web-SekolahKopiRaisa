// const {
//   getLaporanPenjualan,
//   getSummaryPenjualan,
//   getDetailPenjualanProduk
// } = require('./penjualan.service');
// const express = require('express');
// const { authMiddleware } = require('../middleware/middleware');

// /**
//  * Get laporan penjualan UMKM
//  */
// const getLaporanPenjualanUMKM = async (req, res, next) => {
//   try {
//     const { userId } = req.params;
//     const filters = req.query;
//     const requestUser = req.user;
    
//     const laporan = await getLaporanPenjualan(userId, filters, requestUser);
    
//     res.status(200).json({
//       status: 'success',
//       data: laporan
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get summary penjualan UMKM
//  */
// const getSummaryPenjualanUMKM = async (req, res, next) => {
//   try {
//     const { userId } = req.params;
//     const filters = req.query;
//     const requestUser = req.user;
    
//     const summary = await getSummaryPenjualan(userId, filters, requestUser);
    
//     res.status(200).json({
//       status: 'success',
//       data: summary
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Get detail penjualan per produk
//  */
// const getDetailProduk = async (req, res, next) => {
//   try {
//     const { userId, productId } = req.params;
//     const filters = req.query;
//     const requestUser = req.user;
    
//     const detail = await getDetailPenjualanProduk(userId, productId, filters, requestUser);
    
//     res.status(200).json({
//       status: 'success',
//       data: detail
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// const router = express.Router();

// // Get laporan penjualan lengkap
// router.get('/:userId',
//   authMiddleware,
//   getLaporanPenjualanUMKM
// );

// // Get summary penjualan saja
// router.get('/summary/:userId',
//   authMiddleware,
//   getSummaryPenjualanUMKM
// );

// // Get detail penjualan per produk
// router.get('/:userId/product/:productId',
//   authMiddleware,
//   getDetailProduk
// );

// module.exports = router;