const prisma = require('../db');

const PAJAK_RATE = 0.10; // 10%

/**
 * Build where condition untuk filter bulan/tahun
 */
const buildDateFilter = (filters) => {
  const where = {};

  if (filters.bulan && filters.tahun) {
    const month = parseInt(filters.bulan);
    const year = parseInt(filters.tahun);
    
    const startDate = new Date(year, month - 1, 1); // Awal bulan
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Akhir bulan

    where.created_at = {
      gte: startDate,
      lte: endDate,
    };
  } else if (filters.tahun) {
    const year = parseInt(filters.tahun);
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    where.created_at = {
      gte: startDate,
      lte: endDate,
    };
  }

  return where;
};

/**
 * Get sales data by partner
 * Hanya order DELIVERED dengan payment SUCCESS
 */
const getSalesDataByPartner = async (partnerId, filters = {}) => {
  const dateFilter = buildDateFilter(filters);

  const orders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED', // Hanya order selesai
      payment: {
        status: 'SUCCESS', // Hanya yang sudah dibayar
      },
      orderItems: {
        some: {
          partner_id: partnerId, // Filter produk milik partner ini
        },
      },
      ...dateFilter,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      payment: {
        select: {
          amount: true,
          status: true,
          method: true,
        },
      },
      orderItems: {
        where: {
          partner_id: partnerId, // Hanya ambil item milik partner ini
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return orders;
};

/**
 * Get chart data (penjualan per hari dalam bulan)
 */
const getSalesChartData = async (partnerId, filters = {}) => {
  if (!filters.bulan || !filters.tahun) {
    const today = new Date();
    filters.bulan = today.getMonth() + 1;
    filters.tahun = today.getFullYear();
  }

  const dateFilter = buildDateFilter(filters);

  const orders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      payment: {
        status: 'SUCCESS',
      },
      orderItems: {
        some: {
          partner_id: partnerId,
        },
      },
      ...dateFilter,
    },
    include: {
      orderItems: {
        where: {
          partner_id: partnerId,
        },
      },
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  // Group by tanggal
  const salesByDate = {};

  orders.forEach(order => {
    const date = new Date(order.created_at);
    const day = date.getDate();

    if (!salesByDate[day]) {
      salesByDate[day] = 0;
    }

    order.orderItems.forEach(item => {
      salesByDate[day] += item.price * item.quantity;
    });
  });

  // Convert ke array untuk chart
  const chartData = [];
  
  // Jika ada filter bulan, buat data untuk semua hari dalam bulan
  if (filters.bulan && filters.tahun) {
    const year = parseInt(filters.tahun);
    const month = parseInt(filters.bulan);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      chartData.push({
        tanggal: day,
        totalPenjualan: salesByDate[day] || 0,
      });
    }
  } 

  return chartData;
};

/**
 * Get top 5 products by revenue
 */
const getTopProductsByPartner = async (partnerId, filters = {}) => {
  const dateFilter = buildDateFilter(filters);

  const orders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      payment: {
        status: 'SUCCESS',
      },
      orderItems: {
        some: {
          partner_id: partnerId,
        },
      },
      ...dateFilter,
    },
    include: {
      orderItems: {
        where: {
          partner_id: partnerId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  // Aggregate produk
  const productStats = {};

  orders.forEach(order => {
    order.orderItems.forEach(item => {
      const productId = item.product.id;

      if (!productStats[productId]) {
        productStats[productId] = {
          id: productId,
          name: item.product.name,
          image: item.product.image,
          totalQuantity: 0,
          totalRevenue: 0,
        };
      }

      productStats[productId].totalQuantity += item.quantity;
      productStats[productId].totalRevenue += item.price * item.quantity;
    });
  });

  // Sort by quantity (jumlah terjual) dan ambil top 5
  const topProducts = Object.values(productStats)
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 5);

  return topProducts;
};

/**
 * Get sales data untuk semua UMKM (admin)
 */
const getAllUMKMSalesData = async (filters = {}) => {
  if (!filters.bulan || !filters.tahun) {
    const today = new Date();
    filters.bulan = today.getMonth() + 1;
    filters.tahun = today.getFullYear();
  }
  
  const dateFilter = buildDateFilter(filters);

  // Get semua partner yang punya user_id
  const partners = await prisma.partner.findMany({
    where: {
      user_id: {
        not: null,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Get sales data untuk setiap partner
  const allUMKMData = [];

  for (const partner of partners) {
    const orders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        payment: {
          status: 'SUCCESS',
        },
        orderItems: {
          some: {
            partner_id: partner.id,
          },
        },
        ...dateFilter,
      },
      include: {
        orderItems: {
          where: {
            partner_id: partner.id,
          },
        },
      },
    });

    // Hitung summary untuk partner ini
    let totalQuantity = 0;
    let labaKotor = 0;

    orders.forEach(order => {
      order.orderItems.forEach(item => {
        totalQuantity += item.quantity;
        labaKotor += item.price * item.quantity;
      });
    });

    const pajak = labaKotor * PAJAK_RATE;
    const labaBersih = labaKotor - pajak;

    allUMKMData.push({
      partnerId: partner.id,
      namaPartner: partner.name,
      owner: partner.owner_name,
      jumlahProdukTerjual: totalQuantity,
      labaKotorRaw: labaKotor,
      pajak,
      labaBersih,
    });
  }

  // Sort by laba bersih tertinggi
  allUMKMData.sort((a, b) => b.labaBersih - a.labaBersih);

  return allUMKMData;
};

module.exports = {
  getSalesDataByPartner,
  getSalesChartData,
  getTopProductsByPartner,
  getAllUMKMSalesData,
};