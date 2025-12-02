// const prisma = require('../db');

// /**
//  * Get sales report by UMKM
//  * Mengambil semua order yang berisi produk milik UMKM tertentu
//  */
// const getSalesReportByUMKM = async (umkmId, filters = {}) => {
//   try {
//     // 1. Build where condition
//     const where = {
//       status: 'DELIVERED', // Hanya order yang sudah selesai
//       payment: {
//         status: 'SUCCESS' // Hanya yang sudah dibayar
//       },
//       orderItems: {
//         some: {
//           partner: {
//             id_umkm: Number(umkmId) // Filter produk milik UMKM ini
//           }
//         }
//       }
//     };

//     // Filter by tanggal range
//     if (filters.tanggal_dari || filters.tanggal_sampai) {
//       where.created_at = {};
//       if (filters.tanggal_dari) {
//         where.created_at.gte = new Date(filters.tanggal_dari);
//       }
//       if (filters.tanggal_sampai) {
//         where.created_at.lte = new Date(filters.tanggal_sampai);
//       }
//     }

//     // Filter by bulan/tahun
//     if (filters.bulan || filters.tahun) {
//       if (filters.tahun) {
//         const year = Number(filters.tahun);
//         if (filters.bulan) {
//           const month = Number(filters.bulan);
//           const startDate = new Date(year, month - 1, 1);
//           const endDate = new Date(year, month, 0, 23, 59, 59);
//           where.created_at = {
//             gte: startDate,
//             lte: endDate
//           };
//         } else {
//           const startDate = new Date(year, 0, 1);
//           const endDate = new Date(year, 11, 31, 23, 59, 59);
//           where.created_at = {
//             gte: startDate,
//             lte: endDate
//           };
//         }
//       }
//     }

//     // 2. Get orders dengan semua relasi yang dibutuhkan
//     const orders = await prisma.order.findMany({
//       where,
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true,
//             email: true
//           }
//         },
//         payment: {
//           select: {
//             amount: true,
//             status: true,
//             method: true
//           }
//         },
//         shippingAddress: {
//           select: {
//             address: true,
//             destination_city: true,
//             destination_district: true
//           }
//         },
//         orderItems: {
//           where: {
//             partner: {
//               id_umkm: Number(umkmId) // Hanya ambil item milik UMKM ini
//             }
//           },
//           include: {
//             product: {
//               select: {
//                 id: true,
//                 name: true,
//                 price: true,
//                 image: true
//               }
//             },
//             partner: {
//               select: {
//                 id: true,
//                 name: true
//               }
//             }
//           }
//         }
//       },
//       orderBy: {
//         created_at: 'desc'
//       }
//     });

//     return orders;
//   } catch (error) {
//     console.error('❌ Error in getSalesReportByUMKM:', error);
//     throw error;
//   }
// };

// /**
//  * Get summary penjualan by UMKM
//  */
// const getSalesSummaryByUMKM = async (umkmId, filters = {}) => {
//   try {
//     const orders = await getSalesReportByUMKM(umkmId, filters);

//     // Hitung total revenue (hanya dari produk UMKM ini)
//     const totalRevenue = orders.reduce((sum, order) => {
//       const orderTotal = order.orderItems.reduce((itemSum, item) => 
//         itemSum + (item.price * item.quantity), 0
//       );
//       return sum + orderTotal;
//     }, 0);

//     // Hitung total produk terjual
//     const totalProductsSold = orders.reduce((sum, order) => {
//       const orderQty = order.orderItems.reduce((itemSum, item) => 
//         itemSum + item.quantity, 0
//       );
//       return sum + orderQty;
//     }, 0);

//     // Hitung total orders
//     const totalOrders = orders.length;

//     // Product terlaris
//     const productSales = {};
//     orders.forEach(order => {
//       order.orderItems.forEach(item => {
//         if (!productSales[item.product.id]) {
//           productSales[item.product.id] = {
//             id: item.product.id,
//             name: item.product.name,
//             quantity: 0,
//             revenue: 0
//           };
//         }
//         productSales[item.product.id].quantity += item.quantity;
//         productSales[item.product.id].revenue += item.price * item.quantity;
//       });
//     });

//     const topProducts = Object.values(productSales)
//       .sort((a, b) => b.quantity - a.quantity)
//       .slice(0, 5);

//     return {
//       total_revenue: totalRevenue,
//       total_orders: totalOrders,
//       total_products_sold: totalProductsSold,
//       top_products: topProducts
//     };
//   } catch (error) {
//     console.error('❌ Error in getSalesSummaryByUMKM:', error);
//     throw error;
//   }
// };

// /**
//  * Get detail penjualan per produk
//  */
// const getProductSalesDetail = async (umkmId, productId, filters = {}) => {
//   try {
//     const where = {
//       status: 'DELIVERED',
//       payment: {
//         status: 'SUCCESS'
//       },
//       orderItems: {
//         some: {
//           products_id: Number(productId),
//           partner: {
//             id_umkm: Number(umkmId)
//           }
//         }
//       }
//     };

//     // Filter tanggal
//     if (filters.tanggal_dari || filters.tanggal_sampai) {
//       where.created_at = {};
//       if (filters.tanggal_dari) {
//         where.created_at.gte = new Date(filters.tanggal_dari);
//       }
//       if (filters.tanggal_sampai) {
//         where.created_at.lte = new Date(filters.tanggal_sampai);
//       }
//     }

//     const orders = await prisma.order.findMany({
//       where,
//       include: {
//         user: {
//           select: {
//             id: true,
//             name: true
//           }
//         },
//         orderItems: {
//           where: {
//             products_id: Number(productId)
//           },
//           include: {
//             product: true
//           }
//         }
//       },
//       orderBy: {
//         created_at: 'desc'
//       }
//     });

//     return orders;
//   } catch (error) {
//     throw error;
//   }
// };

// module.exports = {
//   getSalesReportByUMKM,
//   getSalesSummaryByUMKM,
//   getProductSalesDetail
// };