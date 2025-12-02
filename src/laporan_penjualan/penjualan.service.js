// const {
//   getSalesReportByUMKM,
//   getSalesSummaryByUMKM,
//   getProductSalesDetail
// } = require('./penjualan.repository');
// const prisma = require('../db');
// const ApiError = require('../utils/apiError');

// /**
//  * Helper: Format periode
//  */
// const formatPeriode = (date) => {
//   const d = new Date(date);
//   const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
//                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
//   return `${bulan[d.getMonth()]} ${d.getFullYear()}`;
// };

// /**
//  * Get laporan penjualan untuk UMKM
//  */
// const getLaporanPenjualan = async (userId, filters, requestUser) => {
//   try {
//     // Validasi akses
//     if (!requestUser.admin && requestUser.id !== Number(userId)) {
//       throw new ApiError(403, 'Anda tidak memiliki akses ke data ini');
//     }

//     // 1. Cari UMKM dari user
//     const umkm = await prisma.verifikasiUMKM.findFirst({
//       where: { 
//         id_user: Number(userId),
//         status_verifikasi: 'Verified' // Hanya UMKM terverifikasi
//       },
//       select: {
//         id_umkm: true,
//         nama_umkm: true,
//         status_verifikasi: true
//       }
//     });

//     if (!umkm) {
//       throw new ApiError(404, 'Data UMKM tidak ditemukan atau belum terverifikasi');
//     }

//     // 2. Get sales data
//     const orders = await getSalesReportByUMKM(umkm.id_umkm, filters);

//     // 3. Transform data untuk response
//     const salesData = orders.map(order => {
//       // Hitung total hanya dari produk UMKM ini
//       const orderTotal = order.orderItems.reduce((sum, item) => 
//         sum + (item.price * item.quantity), 0
//       );

//       return {
//         order_id: order.id,
//         umkm: {
//           id_umkm: umkm.id_umkm,
//           nama_umkm: umkm.nama_umkm
//         },
//         customer: {
//           id: order.user.id,
//           name: order.user.name,
//           email: order.user.email
//         },
//         shipping_address: order.shippingAddress ? {
//           address: order.shippingAddress.address,
//           city: order.shippingAddress.destination_city,
//           district: order.shippingAddress.destination_district
//         } : null,
//         products: order.orderItems.map(item => ({
//           id_product: item.product.id,
//           nama_product: item.product.name,
//           image: item.product.image,
//           quantity: item.quantity,
//           price: item.price,
//           subtotal: item.price * item.quantity
//         })),
//         total_amount: orderTotal,
//         tanggal: order.created_at,
//         periode: formatPeriode(order.created_at),
//         status: order.status,
//         payment_status: order.payment?.status,
//         payment_method: order.payment?.method
//       };
//     });

//     // 4. Get summary
//     const summary = await getSalesSummaryByUMKM(umkm.id_umkm, filters);

//     return {
//       umkm: {
//         id_umkm: umkm.id_umkm,
//         nama_umkm: umkm.nama_umkm
//       },
//       periode: filters.bulan && filters.tahun 
//         ? `${filters.bulan}/${filters.tahun}` 
//         : 'Semua periode',
//       data: salesData,
//       summary: summary
//     };
//   } catch (error) {
//     throw error;
//   }
// };

// /**
//  * Get summary penjualan saja
//  */
// const getSummaryPenjualan = async (userId, filters, requestUser) => {
//   try {
//     if (!requestUser.admin && requestUser.id !== Number(userId)) {
//       throw new ApiError(403, 'Anda tidak memiliki akses ke data ini');
//     }

//     const umkm = await prisma.verifikasiUMKM.findFirst({
//       where: { 
//         id_user: Number(userId),
//         status_verifikasi: 'Verified'
//       },
//       select: {
//         id_umkm: true,
//         nama_umkm: true
//       }
//     });

//     if (!umkm) {
//       throw new ApiError(404, 'Data UMKM tidak ditemukan atau belum terverifikasi');
//     }

//     const summary = await getSalesSummaryByUMKM(umkm.id_umkm, filters);

//     return {
//       umkm: {
//         id_umkm: umkm.id_umkm,
//         nama_umkm: umkm.nama_umkm
//       },
//       periode: filters.bulan && filters.tahun 
//         ? `${filters.bulan}/${filters.tahun}` 
//         : 'Semua periode',
//       summary: summary
//     };
//   } catch (error) {
//     throw error;
//   }
// };

// /**
//  * Get detail penjualan per produk
//  */
// const getDetailPenjualanProduk = async (userId, productId, filters, requestUser) => {
//   try {
//     if (!requestUser.admin && requestUser.id !== Number(userId)) {
//       throw new ApiError(403, 'Anda tidak memiliki akses ke data ini');
//     }

//     const umkm = await prisma.verifikasiUMKM.findFirst({
//       where: { 
//         id_user: Number(userId),
//         status_verifikasi: 'Verified'
//       }
//     });

//     if (!umkm) {
//       throw new ApiError(404, 'Data UMKM tidak ditemukan');
//     }

//     const orders = await getProductSalesDetail(umkm.id_umkm, productId, filters);

//     return orders;
//   } catch (error) {
//     throw error;
//   }
// };

// module.exports = {
//   getLaporanPenjualan,
//   getSummaryPenjualan,
//   getDetailPenjualanProduk
// };